export class ProductNotFoundError extends Error {
  readonly code = "PRODUCT_NOT_FOUND";
}

export class OutOfStockError extends Error {
  readonly code = "OUT_OF_STOCK";
}

export class TransactionNotFoundError extends Error {
  readonly code = "TRANSACTION_NOT_FOUND";
}

export class InvalidTransactionStateError extends Error {
  readonly code = "INVALID_TRANSACTION_STATE";
}

export class PaymentFailedError extends Error {
  readonly code = "PAYMENT_FAILED";
}

export class IdempotencyConflictError extends Error {
  readonly code = "IDEMPOTENCY_CONFLICT";
}
