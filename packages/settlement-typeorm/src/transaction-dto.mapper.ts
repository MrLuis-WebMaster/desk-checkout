import type { TransactionDto } from "@checkout/contracts";
import type { Transaction } from "@checkout/settlement";

export function toTransactionDto(transaction: Transaction): TransactionDto {
  return {
    id: transaction.id,
    status: transaction.status,
    productId: transaction.productId,
    productName: transaction.productName,
    productPrice: transaction.productPrice.amount,
    quantity: transaction.quantity,
    lines: transaction.lines.map((line) => ({
      productId: line.productId,
      productName: line.productName,
      productPrice: line.productPrice.amount,
      quantity: line.quantity,
    })),
    baseFee: transaction.baseFee.amount,
    deliveryFee: transaction.deliveryFee.amount,
    total: transaction.total.amount,
    customer: transaction.customer,
    delivery: transaction.delivery,
    createdAt: transaction.createdAt.toISOString(),
  };
}
