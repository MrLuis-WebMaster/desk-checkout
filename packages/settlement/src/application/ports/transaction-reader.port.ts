import type { TransactionDto } from "@checkout/contracts";
import type { Transaction } from "../../domain/transaction/transaction.js";

export abstract class TransactionReader {
  abstract findById(id: string): Promise<TransactionDto | null>;
  abstract findAggregateById(id: string): Promise<Transaction | null>;
  abstract findAggregateByProviderId(
    providerTransactionId: string,
  ): Promise<Transaction | null>;
  /** PENDING with a real provider id older than `olderThan`. */
  abstract listStuckPending(olderThan: Date): Promise<Transaction[]>;
  /** PENDING with null or claim:* provider id older than `olderThan`. */
  abstract listOrphanPending(olderThan: Date): Promise<Transaction[]>;
}
