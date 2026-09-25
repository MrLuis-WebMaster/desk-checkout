import type { TransactionDto } from "@checkout/contracts";
import type { Transaction } from "../../domain/transaction/transaction.js";

export type PaymentSettlement = {
  dto: TransactionDto;
  stockDecremented: boolean;
};

export abstract class TransactionWriter {
  abstract save(transaction: Transaction): Promise<TransactionDto>;
  abstract claimForPayment(transactionId: string): Promise<boolean>;
  abstract releaseClaim(transactionId: string): Promise<void>;
  /** Replace a payment claim with the real provider transaction id. */
  abstract attachProviderTransactionId(
    transactionId: string,
    providerTransactionId: string,
  ): Promise<void>;
  abstract updateAfterPayment(
    transaction: Transaction,
    options: { decrementStock: boolean },
  ): Promise<PaymentSettlement>;
  /**
   * CAS: PENDING + no real provider charge → persist aggregate Expired (clears claim:*).
   * Returns true when this writer won the update.
   */
  abstract expireUncharged(transaction: Transaction): Promise<boolean>;
}
