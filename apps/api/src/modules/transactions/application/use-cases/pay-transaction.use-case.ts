import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
  TransactionStatus,
  type PayTransactionRequest,
  type TransactionDto,
} from "@checkout/contracts";
import {
  PaymentGateway,
  type ProviderPayment,
} from "#modules/payments/application/ports/payment-gateway.port.js";
import { err, ok, type Result } from "#shared/result/result.js";
import {
  IdempotencyConflictError,
  InvalidTransactionStateError,
  OutOfStockError,
  PaymentFailedError,
  TransactionNotFoundError,
} from "../../domain/transaction/errors.js";
import { toProviderAmountInCents } from "../../domain/transaction/provider-amount.js";
import { IdempotencyStore } from "../ports/idempotency-store.port.js";
import { TransactionReader } from "../ports/transaction-reader.port.js";
import { TransactionWriter } from "../ports/transaction-writer.port.js";
import {
  isUniqueViolation,
  SettleProviderPaymentService,
} from "../services/settle-provider-payment.js";

type PayError =
  | TransactionNotFoundError
  | InvalidTransactionStateError
  | PaymentFailedError
  | IdempotencyConflictError
  | OutOfStockError;

@Injectable()
export class PayTransactionUseCase {
  constructor(
    private readonly transactions: TransactionReader,
    private readonly writer: TransactionWriter,
    private readonly gateway: PaymentGateway,
    private readonly idempotency: IdempotencyStore,
    private readonly settlement: SettleProviderPaymentService,
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

    let provider: ProviderPayment | undefined;
    let claimed = false;
    let providerIdAttached = false;
    try {
      if (transaction.hasProviderCharge()) {
        if (transaction.status !== TransactionStatus.Pending) {
          await this.idempotency.abort(idempotencyKey);
          return err(new InvalidTransactionStateError());
        }
        provider = await this.settlement.pollUntilResolved(
          transaction.providerTransactionId as string,
        );
      } else if (transaction.canStartPayment()) {
        claimed = await this.writer.claimForPayment(transaction.id);
        if (!claimed) {
          await this.idempotency.abort(idempotencyKey);
          return err(new InvalidTransactionStateError());
        }
        provider = await this.gateway.createCardPayment({
          reference: transaction.id,
          amountInCents: toProviderAmountInCents(transaction.total),
          currency: "COP",
          paymentMethodToken: request.paymentMethodToken,
          acceptanceToken: request.acceptanceToken,
          acceptPersonalAuth: request.acceptPersonalAuth,
          installments: request.installments ?? 1,
          customerEmail: transaction.customer.email,
        });
        await this.writer.attachProviderTransactionId(
          transaction.id,
          provider.providerTransactionId,
        );
        providerIdAttached = true;
        if (provider.status === TransactionStatus.Pending) {
          provider = await this.settlement.pollUntilResolved(
            provider.providerTransactionId,
          );
        }
      } else {
        await this.idempotency.abort(idempotencyKey);
        return err(new InvalidTransactionStateError());
      }
    } catch {
      if (claimed && !providerIdAttached) {
        await this.writer.releaseClaim(transaction.id);
      }
      await this.idempotency.abort(idempotencyKey);
      return err(new PaymentFailedError());
    }

    return this.settlement.settle(transaction, provider, idempotencyKey);
  }
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
