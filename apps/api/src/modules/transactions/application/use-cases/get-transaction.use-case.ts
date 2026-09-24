import { Injectable } from "@nestjs/common";
import type { TransactionDto } from "@checkout/contracts";
import { err, ok, type Result } from "#shared/result/result.js";
import { TransactionNotFoundError } from "../../domain/transaction/errors.js";
import { TransactionReader } from "../ports/transaction-reader.port.js";

@Injectable()
export class GetTransactionUseCase {
  constructor(private readonly transactionReader: TransactionReader) {}

  async execute(
    id: string,
  ): Promise<Result<TransactionDto, TransactionNotFoundError>> {
    const transaction = await this.transactionReader.findById(id);
    if (!transaction) {
      return err(new TransactionNotFoundError());
    }
    return ok(transaction);
  }
}
