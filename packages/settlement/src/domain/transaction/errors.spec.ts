import { NoopSettlementLogger } from "../../application/ports/settlement-logger.port";
import {
  IdempotencyConflictError,
  InvalidTransactionStateError,
  OutOfStockError,
  PaymentFailedError,
  ProductNotFoundError,
  TransactionNotFoundError,
} from "./errors";

describe("settlement domain errors", () => {
  it("exposes stable error codes", () => {
    expect(new ProductNotFoundError().code).toBe("PRODUCT_NOT_FOUND");
    expect(new OutOfStockError().code).toBe("OUT_OF_STOCK");
    expect(new TransactionNotFoundError().code).toBe("TRANSACTION_NOT_FOUND");
    expect(new InvalidTransactionStateError().code).toBe(
      "INVALID_TRANSACTION_STATE",
    );
    expect(new PaymentFailedError().code).toBe("PAYMENT_FAILED");
    expect(new IdempotencyConflictError().code).toBe("IDEMPOTENCY_CONFLICT");
  });
});

describe("NoopSettlementLogger", () => {
  it("swallows log calls", () => {
    expect(() => new NoopSettlementLogger().log("noop", { a: 1 })).not.toThrow();
  });
});
