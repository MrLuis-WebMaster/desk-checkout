import { Injectable } from "@nestjs/common";
import {
  TransactionStatus,
  type TransactionDto,
} from "@checkout/contracts";
import {
  PaymentGateway,
  type ProviderPayment,
} from "#modules/payments/application/ports/payment-gateway.port.js";
import { err, ok, type Result } from "#shared/result/result.js";
import {
  InvalidTransactionStateError,
  OutOfStockError,
  PaymentFailedError,
} from "../../domain/transaction/errors.js";
import type { Transaction } from "../../domain/transaction/transaction.js";
import { IdempotencyStore } from "../ports/idempotency-store.port.js";
import { TransactionWriter } from "../ports/transaction-writer.port.js";

export type SettleError =
  | InvalidTransactionStateError
  | PaymentFailedError
  | OutOfStockError;

const POLL_ATTEMPTS = 5;
const POLL_DELAY_MS = process.env.NODE_ENV === "test" ? 0 : 1000;

@Injectable()
export class SettleProviderPaymentService {
  constructor(
    private readonly writer: TransactionWriter,
    private readonly gateway: PaymentGateway,
    private readonly idempotency: IdempotencyStore,
  ) {}

  async pollUntilResolved(
    providerTransactionId: string,
  ): Promise<ProviderPayment> {
    let provider = await this.gateway.getPaymentStatus(providerTransactionId);
    for (
      let attempt = 0;
      provider.status === TransactionStatus.Pending && attempt < POLL_ATTEMPTS;
      attempt += 1
    ) {
      await delay(POLL_DELAY_MS);
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
      await this.idempotency.complete(
        idempotencyKey,
        saved.dto,
        "OUT_OF_STOCK",
      );
      return err(new OutOfStockError());
    }

    await this.idempotency.complete(idempotencyKey, saved.dto);
    return ok(saved.dto);
  }
}

export function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const candidate = error as { code?: string; driverError?: { code?: string } };
  return candidate.code === "23505" || candidate.driverError?.code === "23505";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
