import {
  TransactionStatus,
  type TransactionDto,
} from "@checkout/contracts";
import {
  InvalidTransactionStateError,
  OutOfStockError,
  PaymentFailedError,
} from "../../domain/transaction/errors.js";
import type { Transaction } from "../../domain/transaction/transaction.js";
import { err, ok, type Result } from "../../domain/result.js";
import {
  SettlementPaymentGateway,
  type ProviderPayment,
} from "../ports/payment-gateway.port.js";
import { IdempotencyStore } from "../ports/idempotency-store.port.js";
import {
  SettlementLogger,
  NoopSettlementLogger,
} from "../ports/settlement-logger.port.js";
import { TransactionWriter } from "../ports/transaction-writer.port.js";

export type SettleError =
  | InvalidTransactionStateError
  | PaymentFailedError
  | OutOfStockError;

export type SettleSource = "pay" | "sync" | "webhook" | "stuck_job";

export type SettlePollConfig = {
  pollAttempts: number;
  pollDelayMs: number;
};

const DEFAULT_POLL: SettlePollConfig = {
  pollAttempts: 5,
  pollDelayMs: 1000,
};

export class SettleProviderPaymentService {
  private readonly poll: SettlePollConfig;

  constructor(
    private readonly writer: TransactionWriter,
    private readonly gateway: SettlementPaymentGateway,
    private readonly idempotency: IdempotencyStore,
    private readonly logger: SettlementLogger = new NoopSettlementLogger(),
    poll: SettlePollConfig = DEFAULT_POLL,
  ) {
    this.poll = poll;
  }

  async pollUntilResolved(
    providerTransactionId: string,
  ): Promise<ProviderPayment> {
    let provider = await this.gateway.getPaymentStatus(providerTransactionId);
    for (
      let attempt = 0;
      provider.status === TransactionStatus.Pending &&
      attempt < this.poll.pollAttempts;
      attempt += 1
    ) {
      await delay(this.poll.pollDelayMs);
      provider = await this.gateway.getPaymentStatus(
        provider.providerTransactionId,
      );
    }
    return provider;
  }

  async settle(
    transaction: Transaction,
    provider: ProviderPayment,
    idempotencyKey: string,
    source: SettleSource = "pay",
  ): Promise<Result<TransactionDto, SettleError>> {
    let settled: Transaction;
    try {
      settled = transaction.applyProviderResult(
        provider.providerTransactionId,
        provider.status,
      );
    } catch (error) {
      if (error instanceof InvalidTransactionStateError) {
        await this.idempotency.abort(idempotencyKey);
        this.logger.log("settle_outcome", {
          status: "invalid_state",
          transactionId: transaction.id,
          providerId: provider.providerTransactionId,
          source,
        });
        return err(error);
      }
      throw error;
    }

    const saved = await this.writer.updateAfterPayment(settled, {
      decrementStock: settled.status === TransactionStatus.Approved,
    });

    if (
      settled.status === TransactionStatus.Approved &&
      !saved.stockDecremented
    ) {
      await this.compensateApprovedWithoutStock(
        transaction.id,
        provider.providerTransactionId,
        source,
      );
      await this.idempotency.complete(
        idempotencyKey,
        saved.dto,
        "OUT_OF_STOCK",
      );
      this.logger.log("settle_outcome", {
        status: TransactionStatus.Error,
        transactionId: transaction.id,
        providerId: provider.providerTransactionId,
        source,
        reason: "OUT_OF_STOCK",
      });
      return err(new OutOfStockError());
    }

    // Still pending at the provider: do not seal the idempotency key so pay/sync
    // can re-poll. Webhook/stuck use per-status keys and will retry later.
    if (saved.dto.status === TransactionStatus.Pending) {
      await this.idempotency.abort(idempotencyKey);
      this.logger.log("settle_outcome", {
        status: TransactionStatus.Pending,
        transactionId: transaction.id,
        providerId: provider.providerTransactionId,
        source,
        reason: "still_pending",
      });
      return ok(saved.dto);
    }

    await this.idempotency.complete(idempotencyKey, saved.dto);
    this.logger.log("settle_outcome", {
      status: saved.dto.status,
      transactionId: transaction.id,
      providerId: provider.providerTransactionId,
      source,
    });
    return ok(saved.dto);
  }

  private async compensateApprovedWithoutStock(
    transactionId: string,
    providerId: string,
    source: SettleSource,
  ): Promise<void> {
    this.logger.log("compensation_attempted", {
      transactionId,
      providerId,
      orderId: transactionId,
      source,
    });
    try {
      await this.gateway.voidPayment(providerId);
      this.logger.log("compensation_succeeded", {
        transactionId,
        providerId,
        orderId: transactionId,
        source,
      });
    } catch {
      this.logger.log("compensation_failed", {
        transactionId,
        providerId,
        orderId: transactionId,
        source,
      });
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
