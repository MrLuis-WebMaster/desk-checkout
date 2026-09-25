import type { CreateTransactionRequest } from "@checkout/contracts";
import type { CreateTransactionDto } from "../dto/transaction.dto.js";

export function toCreateTransactionRequest(
  dto: CreateTransactionDto,
): CreateTransactionRequest {
  return {
    items: dto.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    })),
    customer: { ...dto.customer },
    delivery: { ...dto.delivery },
  };
}
