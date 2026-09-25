import { Injectable } from "@nestjs/common";
import {
  TransactionStatus,
  type WidgetCheckoutSessionDto,
} from "@checkout/contracts";
import { PaymentGateway } from "#modules/payments/application/ports/payment-gateway.port.js";
import { err, ok, type Result } from "#shared/result/result.js";
import {
  InvalidTransactionStateError,
  TransactionNotFoundError,
} from "../../domain/transaction/errors.js";
import { toProviderAmountInCents } from "../../domain/transaction/provider-amount.js";
import { TransactionReader } from "../ports/transaction-reader.port.js";

type WidgetSessionError =
  | TransactionNotFoundError
  | InvalidTransactionStateError;

@Injectable()
export class GetWidgetCheckoutSessionUseCase {
  constructor(
    private readonly transactions: TransactionReader,
    private readonly gateway: PaymentGateway,
  ) {}

  async execute(
    transactionId: string,
  ): Promise<Result<WidgetCheckoutSessionDto, WidgetSessionError>> {
    const transaction =
      await this.transactions.findAggregateById(transactionId);
    if (!transaction) {
      return err(new TransactionNotFoundError());
    }
    if (transaction.status !== TransactionStatus.Pending) {
      return err(new InvalidTransactionStateError());
    }
    if (transaction.hasProviderCharge()) {
      return err(new InvalidTransactionStateError());
    }

    const session = this.gateway.createWidgetSession({
      reference: transaction.id,
      amountInCents: toProviderAmountInCents(transaction.total),
      currency: "COP",
    });
    return ok(session);
  }
}
