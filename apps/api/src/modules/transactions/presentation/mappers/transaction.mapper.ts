import type { CreateTransactionRequest } from "@checkout/contracts";
import type { CreateTransactionDto } from "../dto/transaction.dto.js";

export function toCreateTransactionRequest(
  dto: CreateTransactionDto,
): CreateTransactionRequest {
  return {
    productId: dto.productId,
    customer: { ...dto.customer },
    delivery: { ...dto.delivery },
  };
}
