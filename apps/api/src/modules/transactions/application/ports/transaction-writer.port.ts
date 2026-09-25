import type { TransactionDto } from "@checkout/contracts";
import type { Transaction } from "../../domain/transaction/transaction.js";

export type PaymentSettlement = {
  dto: TransactionDto;
  stockDecremented: boolean;
};

export abstract class TransactionWriter {
  abstract save(transaction: Transaction): Promise<TransactionDto>;
  abstract claimForPayment(transactionId: string): Promise<boolean>;
  abstract updateAfterPayment(
    transaction: Transaction,
    options: { decrementStock: boolean },
  ): Promise<PaymentSettlement>;
}
