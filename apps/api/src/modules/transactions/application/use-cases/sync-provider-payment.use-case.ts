import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
  TransactionStatus,
  type SyncProviderPaymentRequest,
  type TransactionDto,
} from "@checkout/contracts";
import { providerPaymentMatchesTransaction } from "@checkout/settlement";
import { err, ok, type Result } from "#shared/result/result.js";
import {
  IdempotencyConflictError,
  InvalidTransactionStateError,
  OutOfStockError,
  PaymentFailedError,
  TransactionNotFoundError,
} from "../../domain/transaction/errors.js";
import { IdempotencyStore } from "../ports/idempotency-store.port.js";
import { TransactionReader } from "../ports/transaction-reader.port.js";
import { SettleProviderPaymentService } from "../services/settle-provider-payment.js";

type SyncError =
  | TransactionNotFoundError
  | InvalidTransactionStateError
  | PaymentFailedError
  | IdempotencyConflictError
  | OutOfStockError;

@Injectable()
export class SyncProviderPaymentUseCase {
  constructor(
    private readonly transactions: TransactionReader,
    private readonly idempotency: IdempotencyStore,
    private readonly settlement: SettleProviderPaymentService,
  ) {}

  async execute(
    transactionId: string,
    idempotencyKey: string,
    request: SyncProviderPaymentRequest,
  ): Promise<Result<TransactionDto, SyncError>> {
    const requestHash = hashSyncRequest(request);
    const existing = await this.idempotency.find(idempotencyKey);
    if (existing) {
      if (
        existing.transactionId !== transactionId ||
        existing.requestHash !== requestHash
      ) {
        return err(new IdempotencyConflictError());
      }
      if (existing.errorCode === "OUT_OF_STOCK") {
        return err(new OutOfStockError());
      }
      if (existing.response) {
        return ok(existing.response);
      }
      return err(new IdempotencyConflictError());
    }

    try {
      await this.idempotency.begin(idempotencyKey, transactionId, requestHash);
    } catch (error) {
      if (error instanceof IdempotencyConflictError) {
        return err(error);
      }
      throw error;
    }

    const transaction =
      await this.transactions.findAggregateById(transactionId);
    if (!transaction) {
      await this.idempotency.abort(idempotencyKey);
      return err(new TransactionNotFoundError());
    }

    if (
      transaction.hasProviderCharge() &&
      transaction.providerTransactionId === request.providerTransactionId &&
      transaction.status !== TransactionStatus.Pending
    ) {
      const current = await this.transactions.findById(transactionId);
      if (!current) {
        await this.idempotency.abort(idempotencyKey);
        return err(new TransactionNotFoundError());
      }
      await this.idempotency.complete(idempotencyKey, current);
      return ok(current);
    }

    if (
      transaction.hasProviderCharge() &&
      transaction.providerTransactionId !== request.providerTransactionId
    ) {
      await this.idempotency.abort(idempotencyKey);
      return err(new InvalidTransactionStateError());
    }

    let provider;
    try {
      provider = await this.settlement.pollUntilResolved(
        request.providerTransactionId,
      );
    } catch {
      await this.idempotency.abort(idempotencyKey);
      return err(new PaymentFailedError());
    }

    if (!providerPaymentMatchesTransaction(provider, transaction)) {
      await this.idempotency.abort(idempotencyKey);
      return err(new InvalidTransactionStateError());
    }

    return this.settlement.settle(
      transaction,
      provider,
      idempotencyKey,
      "sync",
    );
  }
}

function hashSyncRequest(request: SyncProviderPaymentRequest): string {
  return createHash("sha256")
    .update(
      JSON.stringify({ providerTransactionId: request.providerTransactionId }),
    )
    .digest("hex");
}
