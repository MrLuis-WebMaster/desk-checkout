import { TransactionStatus } from "@checkout/contracts";
import { Money } from "../../domain/money.js";
import { Transaction } from "../../domain/transaction/transaction.js";
import type { SettlementPaymentGateway } from "../ports/payment-gateway.port.js";
import type { IdempotencyStore } from "../ports/idempotency-store.port.js";
import type { SettlementLogger } from "../ports/settlement-logger.port.js";
import type { TransactionWriter } from "../ports/transaction-writer.port.js";
import { SettleProviderPaymentService } from "./settle-provider-payment.js";

function pendingTransaction() {
  return Transaction.rehydrate({
    id: "33333333-3333-4333-8333-333333333333",
    status: TransactionStatus.Pending,
    lines: [
      {
        productId: "11111111-1111-4111-8111-111111111111",
        productName: "Lamp",
        productPrice: Money.create(10000),
        quantity: 1,
      },
    ],
    baseFee: Money.create(500),
    deliveryFee: Money.create(1500),
    total: Money.create(12000),
    customer: {
      fullName: "Ada",
      email: "ada@example.com",
      phone: "300",
    },
    delivery: {
      shippingMethodId: "22222222-2222-4222-8222-222222222222",
      addressLine: "Street",
      city: "BOG",
    },
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    providerTransactionId: null,
  });
}

describe("SettleProviderPaymentService", () => {
  const writer = {
    save: jest.fn(),
    claimForPayment: jest.fn(),
    releaseClaim: jest.fn(),
    attachProviderTransactionId: jest.fn(),
    updateAfterPayment: jest.fn(),
    expireUncharged: jest.fn(),
  };
  const gateway = {
    getPaymentStatus: jest.fn(),
    voidPayment: jest.fn(),
  };
  const idempotency = {
    find: jest.fn(),
    begin: jest.fn(),
    complete: jest.fn(),
    abort: jest.fn(),
  };
  const logger: SettlementLogger = { log: jest.fn() };
  const service = new SettleProviderPaymentService(
    writer as TransactionWriter,
    gateway as SettlementPaymentGateway,
    idempotency as IdempotencyStore,
    logger,
    { pollAttempts: 5, pollDelayMs: 0 },
  );

  beforeEach(() => {
    jest.resetAllMocks();
    idempotency.complete.mockResolvedValue(undefined);
    idempotency.abort.mockResolvedValue(undefined);
    gateway.voidPayment.mockResolvedValue(undefined);
  });

  it("polls until the provider leaves pending", async () => {
    gateway.getPaymentStatus
      .mockResolvedValueOnce({
        providerTransactionId: "wompi_1",
        status: TransactionStatus.Pending,
      })
      .mockResolvedValueOnce({
        providerTransactionId: "wompi_1",
        status: TransactionStatus.Approved,
      });

    const provider = await service.pollUntilResolved("wompi_1");

    expect(provider.status).toBe(TransactionStatus.Approved);
    expect(gateway.getPaymentStatus).toHaveBeenCalledTimes(2);
  });

  it("settles an approved provider result and completes idempotency", async () => {
    writer.updateAfterPayment.mockImplementation(async (transaction) => ({
      dto: { id: transaction.id, status: transaction.status },
      stockDecremented: true,
    }));

    const result = await service.settle(
      pendingTransaction(),
      {
        providerTransactionId: "wompi_1",
        status: TransactionStatus.Approved,
      },
      "key-1",
      "sync",
    );

    expect(result.ok).toBe(true);
    expect(writer.updateAfterPayment).toHaveBeenCalledWith(
      expect.objectContaining({ status: TransactionStatus.Approved }),
      { decrementStock: true },
    );
    expect(idempotency.complete).toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(
      "settle_outcome",
      expect.objectContaining({ source: "sync" }),
    );
  });

  it("aborts idempotency when settlement remains pending", async () => {
    writer.updateAfterPayment.mockImplementation(async (transaction) => ({
      dto: { id: transaction.id, status: TransactionStatus.Pending },
      stockDecremented: false,
    }));

    const result = await service.settle(
      pendingTransaction(),
      {
        providerTransactionId: "wompi_pending",
        status: TransactionStatus.Pending,
      },
      "key-pending",
      "pay",
    );

    expect(result.ok).toBe(true);
    expect(idempotency.abort).toHaveBeenCalledWith("key-pending");
    expect(idempotency.complete).not.toHaveBeenCalled();
  });

  it("returns out of stock and voids when approved settlement cannot decrement", async () => {
    writer.updateAfterPayment.mockResolvedValue({
      dto: {
        id: pendingTransaction().id,
        status: TransactionStatus.Error,
      },
      stockDecremented: false,
    });

    const result = await service.settle(
      pendingTransaction(),
      {
        providerTransactionId: "wompi_1",
        status: TransactionStatus.Approved,
      },
      "key-2",
      "webhook",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("OUT_OF_STOCK");
    }
    expect(gateway.voidPayment).toHaveBeenCalledWith("wompi_1");
    expect(logger.log).toHaveBeenCalledWith(
      "compensation_attempted",
      expect.objectContaining({ orderId: pendingTransaction().id }),
    );
    expect(logger.log).toHaveBeenCalledWith(
      "compensation_succeeded",
      expect.objectContaining({ orderId: pendingTransaction().id }),
    );
    expect(idempotency.complete).toHaveBeenCalledWith(
      "key-2",
      expect.objectContaining({ status: TransactionStatus.Error }),
      "OUT_OF_STOCK",
    );
  });

  it("logs compensation_failed when void throws", async () => {
    writer.updateAfterPayment.mockResolvedValue({
      dto: {
        id: pendingTransaction().id,
        status: TransactionStatus.Error,
      },
      stockDecremented: false,
    });
    gateway.voidPayment.mockRejectedValue(new Error("void failed"));

    const result = await service.settle(
      pendingTransaction(),
      {
        providerTransactionId: "wompi_1",
        status: TransactionStatus.Approved,
      },
      "key-3",
    );

    expect(result.ok).toBe(false);
    expect(logger.log).toHaveBeenCalledWith(
      "compensation_failed",
      expect.objectContaining({ providerId: "wompi_1" }),
    );
  });
});
