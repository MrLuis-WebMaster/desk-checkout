import type { TransactionDto } from "@checkout/contracts";
import type { Transaction } from "../../domain/transaction/transaction.js";

export abstract class TransactionReader {
  abstract findById(id: string): Promise<TransactionDto | null>;
  abstract findAggregateById(id: string): Promise<Transaction | null>;
  abstract findAggregateByProviderId(
    providerTransactionId: string,
  ): Promise<Transaction | null>;
  /** PENDING with a real (non-claim) provider id older than `olderThan`. */
  abstract listStuckPending(olderThan: Date): Promise<Transaction[]>;
  /**
   * PENDING with no provider id (`created_at` before `olderThan`), or a stale
   * `claim:*` whose row `updated_at` is before `claimLeaseBefore`.
   */
  abstract listOrphanPending(
    olderThan: Date,
    options: { claimLeaseBefore: Date },
  ): Promise<Transaction[]>;
}
