import { TransactionStatus } from "@checkout/contracts";
import { Money } from "#shared/domain/money.js";
import type { PaymentGateway } from "#modules/payments/application/ports/payment-gateway.port.js";
import { PaymentGatewayError } from "#modules/payments/domain/payment/errors.js";
import { Transaction } from "../../domain/transaction/transaction.js";
import type { IdempotencyStore } from "../ports/idempotency-store.port.js";
import type { TransactionReader } from "../ports/transaction-reader.port.js";
import type { TransactionWriter } from "../ports/transaction-writer.port.js";
import { PayTransactionUseCase } from "./pay-transaction.use-case.js";

const payRequest = {
  paymentMethodToken: "tok_test",
  acceptanceToken: "acc",
  acceptPersonalAuth: "auth",
  installments: 1,
};

function pendingTransaction() {
  return Transaction.rehydrate({
    id: "33333333-3333-4333-8333-333333333333",
    status: TransactionStatus.Pending,
    productId: "11111111-1111-4111-8111-111111111111",
    productName: "Lamp",
    productPrice: Money.create(10000),
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
      city: "Bogotá",
      regionCode: "BOG",
      postalCode: "110111",
    },
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    providerTransactionId: null,
  });
}

describe("PayTransactionUseCase", () => {
  const transactions = { findById: jest.fn(), findAggregateById: jest.fn() };
  const writer = {
    save: jest.fn(),
    claimForPayment: jest.fn(),
    releaseClaim: jest.fn(),
    updateAfterPayment: jest.fn(),
  };
  const gateway = {
    getAcceptanceTokens: jest.fn(),
    createCardPayment: jest.fn(),
    getPaymentStatus: jest.fn(),
  };
  const idempotency = {
    find: jest.fn(),
    begin: jest.fn(),
    complete: jest.fn(),
    abort: jest.fn(),
  };
  const useCase = new PayTransactionUseCase(
    transactions as TransactionReader,
    writer as TransactionWriter,
    gateway as PaymentGateway,
    idempotency as IdempotencyStore,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    idempotency.find.mockResolvedValue(null);
    writer.claimForPayment.mockResolvedValue(true);
    writer.releaseClaim.mockResolvedValue(undefined);
    idempotency.begin.mockResolvedValue(undefined);
    idempotency.complete.mockResolvedValue(undefined);
    idempotency.abort.mockResolvedValue(undefined);
    transactions.findAggregateById.mockResolvedValue(pendingTransaction());
  });

  it("decrements stock when the charge is approved", async () => {
    gateway.createCardPayment.mockResolvedValue({
      providerTransactionId: "wompi_1",
      status: TransactionStatus.Approved,
    });
    writer.updateAfterPayment.mockImplementation(async (transaction) => ({
      dto: { id: transaction.id, status: transaction.status },
      stockDecremented: true,
    }));

    const result = await useCase.execute(
      pendingTransaction().id,
      "key-1",
      payRequest,
    );

    expect(result.ok).toBe(true);
    expect(writer.updateAfterPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        status: TransactionStatus.Approved,
        providerTransactionId: "wompi_1",
      }),
      { decrementStock: true },
    );
    expect(gateway.getPaymentStatus).not.toHaveBeenCalled();
    expect(gateway.createCardPayment).toHaveBeenCalledWith(
      expect.objectContaining({ amountInCents: 1_200_000 }),
    );
  });

  it("does not decrement stock when the charge is declined", async () => {
    gateway.createCardPayment.mockResolvedValue({
      providerTransactionId: "wompi_2",
      status: TransactionStatus.Declined,
    });
    writer.updateAfterPayment.mockImplementation(async (transaction) => ({
      dto: { id: transaction.id, status: transaction.status },
      stockDecremented: false,
    }));

    await useCase.execute(pendingTransaction().id, "key-2", payRequest);

    expect(writer.updateAfterPayment).toHaveBeenCalledWith(
      expect.objectContaining({ status: TransactionStatus.Declined }),
      { decrementStock: false },
    );
  });

  it("polls while the provider stays pending", async () => {
    gateway.createCardPayment.mockResolvedValue({
      providerTransactionId: "wompi_3",
      status: TransactionStatus.Pending,
    });
    gateway.getPaymentStatus.mockResolvedValue({
      providerTransactionId: "wompi_3",
      status: TransactionStatus.Approved,
    });
    writer.updateAfterPayment.mockImplementation(async (transaction) => ({
      dto: { id: transaction.id, status: transaction.status },
      stockDecremented: true,
    }));

    await useCase.execute(pendingTransaction().id, "key-3", payRequest);

    expect(gateway.getPaymentStatus).toHaveBeenCalledTimes(1);
    expect(writer.updateAfterPayment).toHaveBeenCalledWith(
      expect.objectContaining({ status: TransactionStatus.Approved }),
      { decrementStock: true },
    );
  });

  it("replays a stored response without charging again", async () => {
    const stored = { id: pendingTransaction().id, status: TransactionStatus.Approved };
    idempotency.find.mockResolvedValue({
      transactionId: pendingTransaction().id,
      requestHash: expect.any(String),
      response: stored,
    });
    const firstHash = await useCase.execute(
      pendingTransaction().id,
      "key-4",
      payRequest,
    );
    expect(firstHash.ok).toBe(false);

    const { createHash } = await import("node:crypto");
    const requestHash = createHash("sha256")
      .update(JSON.stringify(payRequest))
      .digest("hex");
    idempotency.find.mockResolvedValue({
      transactionId: pendingTransaction().id,
      requestHash,
      response: stored,
      errorCode: null,
    });

    const result = await useCase.execute(
      pendingTransaction().id,
      "key-4",
      payRequest,
    );
    expect(result).toEqual({ ok: true, value: stored });
    expect(gateway.createCardPayment).not.toHaveBeenCalled();
  });

  it("rejects a reused key with a different body", async () => {
    const { createHash } = await import("node:crypto");
    idempotency.find.mockResolvedValue({
      transactionId: pendingTransaction().id,
      requestHash: createHash("sha256").update("other").digest("hex"),
      response: { id: "x" },
      errorCode: null,
    });

    const result = await useCase.execute(
      pendingTransaction().id,
      "key-5",
      payRequest,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("IDEMPOTENCY_CONFLICT");
    }
  });

  it("rejects a transaction that is not pending", async () => {
    const paid = pendingTransaction().applyProviderResult(
      "wompi_9",
      TransactionStatus.Approved,
    );
    transactions.findAggregateById.mockResolvedValue(paid);

    const result = await useCase.execute(paid.id, "key-6", payRequest);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_TRANSACTION_STATE");
    }
    expect(gateway.createCardPayment).not.toHaveBeenCalled();
  });

  it("returns out of stock after an approved charge that cannot decrement", async () => {
    gateway.createCardPayment.mockResolvedValue({
      providerTransactionId: "wompi_7",
      status: TransactionStatus.Approved,
    });
    writer.updateAfterPayment.mockResolvedValue({
      dto: { id: pendingTransaction().id, status: TransactionStatus.Approved },
      stockDecremented: false,
    });

    const result = await useCase.execute(
      pendingTransaction().id,
      "key-7",
      payRequest,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("OUT_OF_STOCK");
    }
    expect(idempotency.complete).toHaveBeenCalled();
  });

  it("releases the claim when the provider fails before a charge exists", async () => {
    gateway.createCardPayment.mockRejectedValue(new PaymentGatewayError("down"));
    const result = await useCase.execute(
      pendingTransaction().id,
      "key-8",
      payRequest,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PAYMENT_FAILED");
    }
    expect(writer.releaseClaim).toHaveBeenCalledWith(pendingTransaction().id);
    expect(idempotency.abort).toHaveBeenCalledWith("key-8");
  });

  it("settles a pending provider charge when a later poll is approved", async () => {
    const charged = Transaction.rehydrate({
      id: pendingTransaction().id,
      status: TransactionStatus.Pending,
      productId: "11111111-1111-4111-8111-111111111111",
      productName: "Lamp",
      productPrice: Money.create(10000),
      baseFee: Money.create(500),
      deliveryFee: Money.create(1500),
      total: Money.create(12000),
      customer: pendingTransaction().customer,
      delivery: pendingTransaction().delivery,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      providerTransactionId: "wompi_pending",
    });
    transactions.findAggregateById.mockResolvedValue(charged);
    gateway.getPaymentStatus.mockResolvedValue({
      providerTransactionId: "wompi_pending",
      status: TransactionStatus.Approved,
    });
    writer.updateAfterPayment.mockImplementation(async (transaction) => ({
      dto: { id: transaction.id, status: transaction.status },
      stockDecremented: true,
    }));

    const result = await useCase.execute(charged.id, "key-9", payRequest);

    expect(result.ok).toBe(true);
    expect(writer.claimForPayment).not.toHaveBeenCalled();
    expect(gateway.createCardPayment).not.toHaveBeenCalled();
    expect(writer.updateAfterPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        status: TransactionStatus.Approved,
        providerTransactionId: "wompi_pending",
      }),
      { decrementStock: true },
    );
  });
});
