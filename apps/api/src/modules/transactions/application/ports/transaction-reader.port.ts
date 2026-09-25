import type { TransactionDto } from "@checkout/contracts";
import type { Transaction } from "../../domain/transaction/transaction.js";

export abstract class TransactionReader {
  abstract findById(id: string): Promise<TransactionDto | null>;
  abstract findAggregateById(id: string): Promise<Transaction | null>;
}
