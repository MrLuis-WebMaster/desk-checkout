import type { TransactionDto } from "@checkout/contracts";

export abstract class TransactionReader {
  abstract findById(id: string): Promise<TransactionDto | null>;
}
