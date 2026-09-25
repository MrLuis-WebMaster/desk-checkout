import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
  TransactionStatus,
  type PayTransactionRequest,
  type TransactionDto,
} from "@checkout/contracts";
import { PaymentGateway } from "#modules/payments/application/ports/payment-gateway.port.js";
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
import { TransactionWriter } from "../ports/transaction-writer.port.js";

type PayError =
  | TransactionNotFoundError
  | InvalidTransactionStateError
  | PaymentFailedError
  | IdempotencyConflictError
  | OutOfStockError;

const POLL_ATTEMPTS = 5;
const POLL_DELAY_MS = process.env.NODE_ENV === "test" ? 0 : 1000;

@Injectable()
export class PayTransactionUseCase {
  constructor(
    private readonly transactions: TransactionReader,
    private readonly writer: TransactionWriter,
    private readonly gateway: PaymentGateway,
    private readonly idempotency: IdempotencyStore,
  ) {}

  async execute(
    transactionId: string,
    idempotencyKey: string,
    request: PayTransactionRequest,
  ): Promise<Result<TransactionDto, PayError>> {
    const requestHash = hashPayRequest(request);
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
      if (isUniqueViolation(error)) {
        return err(new IdempotencyConflictError());
      }
      throw error;
    }

    const transaction =
      await this.transactions.findAggregateById(transactionId);
    if (!transaction) {
      await this.idempotency.abort(idempotencyKey);
      return err(new TransactionNotFoundError());
    }

    let provider;
    try {
      if (transaction.hasProviderCharge()) {
        if (transaction.status !== TransactionStatus.Pending) {
          await this.idempotency.abort(idempotencyKey);
          return err(new InvalidTransactionStateError());
        }
        provider = await this.gateway.getPaymentStatus(
          transaction.providerTransactionId as string,
        );
      } else if (transaction.canStartPayment()) {
        const claimed = await this.writer.claimForPayment(transaction.id);
        if (!claimed) {
          await this.idempotency.abort(idempotencyKey);
          return err(new InvalidTransactionStateError());
        }
        provider = await this.gateway.createCardPayment({
          reference: transaction.id,
          amountInCents: transaction.total.amount * 100,
          currency: "COP",
          paymentMethodToken: request.paymentMethodToken,
          acceptanceToken: request.acceptanceToken,
          acceptPersonalAuth: request.acceptPersonalAuth,
          installments: request.installments ?? 1,
          customerEmail: transaction.customer.email,
        });
      } else {
        await this.idempotency.abort(idempotencyKey);
        return err(new InvalidTransactionStateError());
      }
      for (
        let attempt = 0;
        provider.status === TransactionStatus.Pending &&
        attempt < POLL_ATTEMPTS;
        attempt += 1
      ) {
        await delay(POLL_DELAY_MS);
        provider = await this.gateway.getPaymentStatus(
          provider.providerTransactionId,
        );
      }
    } catch {
      return err(new PaymentFailedError());
    }

    let settled;
    try {
      settled = transaction.applyProviderResult(
        provider.providerTransactionId,
        provider.status,
      );
    } catch (error) {
      if (error instanceof InvalidTransactionStateError) {
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

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const candidate = error as { code?: string; driverError?: { code?: string } };
  return candidate.code === "23505" || candidate.driverError?.code === "23505";
}

function hashPayRequest(request: PayTransactionRequest): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        paymentMethodToken: request.paymentMethodToken,
        acceptanceToken: request.acceptanceToken,
        acceptPersonalAuth: request.acceptPersonalAuth,
        installments: request.installments ?? 1,
      }),
    )
    .digest("hex");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
