import type { TransactionDto } from "@checkout/contracts";
import type { Transaction } from "../../domain/transaction/transaction.js";

export abstract class TransactionWriter {
  abstract save(transaction: Transaction): Promise<TransactionDto>;
}
