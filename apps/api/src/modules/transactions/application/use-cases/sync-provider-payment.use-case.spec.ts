import { TransactionStatus } from "@checkout/contracts";
import { Money } from "#shared/domain/money.js";
import type { PaymentGateway } from "#modules/payments/application/ports/payment-gateway.port.js";
import { PaymentGatewayError } from "#modules/payments/domain/payment/errors.js";
import { Transaction } from "../../domain/transaction/transaction.js";
import type { IdempotencyStore } from "../ports/idempotency-store.port.js";
import type { TransactionReader } from "../ports/transaction-reader.port.js";
import type { TransactionWriter } from "../ports/transaction-writer.port.js";
import { SettleProviderPaymentService } from "../services/settle-provider-payment.js";
import { SyncProviderPaymentUseCase } from "./sync-provider-payment.use-case.js";

const syncRequest = { providerTransactionId: "wompi_1" };

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

describe("SyncProviderPaymentUseCase", () => {
  const transactions = {
    findById: jest.fn(),
    findAggregateById: jest.fn(),
    findAggregateByProviderId: jest.fn(),
    listStuckPending: jest.fn(),
    listOrphanPending: jest.fn(),
  };
  const writer = {
    save: jest.fn(),
    claimForPayment: jest.fn(),
    releaseClaim: jest.fn(),
    attachProviderTransactionId: jest.fn(),
    updateAfterPayment: jest.fn(),
    expireUncharged: jest.fn(),
  };
  const gateway = {
    getAcceptanceTokens: jest.fn(),
    createCardPayment: jest.fn(),
    createWidgetSession: jest.fn(),
    getPaymentStatus: jest.fn(),
    voidPayment: jest.fn(),
  };
  const idempotency = {
    find: jest.fn(),
    begin: jest.fn(),
    complete: jest.fn(),
    abort: jest.fn(),
  };
  const settlement = new SettleProviderPaymentService(
    writer as TransactionWriter,
    gateway as PaymentGateway,
    idempotency as IdempotencyStore,
  );
  const useCase = new SyncProviderPaymentUseCase(
    transactions as TransactionReader,
    idempotency as IdempotencyStore,
    settlement,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    idempotency.find.mockResolvedValue(null);
    idempotency.begin.mockResolvedValue(undefined);
    idempotency.complete.mockResolvedValue(undefined);
    idempotency.abort.mockResolvedValue(undefined);
    transactions.findAggregateById.mockResolvedValue(pendingTransaction());
  });

  it("decrements stock when the provider charge is approved", async () => {
    gateway.getPaymentStatus.mockResolvedValue({
      providerTransactionId: "wompi_1",
      status: TransactionStatus.Approved,
      reference: pendingTransaction().id,
      amountInCents: 1_200_000,
    });
    writer.updateAfterPayment.mockImplementation(async (transaction) => ({
      dto: { id: transaction.id, status: transaction.status },
      stockDecremented: true,
    }));

    const result = await useCase.execute(
      pendingTransaction().id,
      "key-1",
      syncRequest,
    );

    expect(result.ok).toBe(true);
    expect(writer.updateAfterPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        status: TransactionStatus.Approved,
        providerTransactionId: "wompi_1",
      }),
      { decrementStock: true },
    );
  });

  it("rejects a provider charge bound to a different order reference", async () => {
    gateway.getPaymentStatus.mockResolvedValue({
      providerTransactionId: "wompi_1",
      status: TransactionStatus.Approved,
      reference: "other-order",
      amountInCents: 1_200_000,
    });

    const result = await useCase.execute(
      pendingTransaction().id,
      "key-hijack",
      syncRequest,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_TRANSACTION_STATE");
    }
    expect(writer.updateAfterPayment).not.toHaveBeenCalled();
    expect(idempotency.abort).toHaveBeenCalledWith("key-hijack");
  });

  it("rejects a provider charge with a mismatched amount", async () => {
    gateway.getPaymentStatus.mockResolvedValue({
      providerTransactionId: "wompi_1",
      status: TransactionStatus.Approved,
      reference: pendingTransaction().id,
      amountInCents: 999,
    });

    const result = await useCase.execute(
      pendingTransaction().id,
      "key-amount",
      syncRequest,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_TRANSACTION_STATE");
    }
    expect(writer.updateAfterPayment).not.toHaveBeenCalled();
  });

  it("returns the current dto when already terminal with the same provider id", async () => {
    const approved = pendingTransaction().applyProviderResult(
      "wompi_1",
      TransactionStatus.Approved,
    );
    const dto = {
      id: approved.id,
      status: TransactionStatus.Approved,
    };
    transactions.findAggregateById.mockResolvedValue(approved);
    transactions.findById.mockResolvedValue(dto);

    const result = await useCase.execute(approved.id, "key-2", syncRequest);

    expect(result).toEqual({ ok: true, value: dto });
    expect(gateway.getPaymentStatus).not.toHaveBeenCalled();
    expect(writer.updateAfterPayment).not.toHaveBeenCalled();
  });

  it("polls while the provider stays pending", async () => {
    gateway.getPaymentStatus
      .mockResolvedValueOnce({
        providerTransactionId: "wompi_1",
        status: TransactionStatus.Pending,
        reference: pendingTransaction().id,
        amountInCents: 1_200_000,
      })
      .mockResolvedValueOnce({
        providerTransactionId: "wompi_1",
        status: TransactionStatus.Approved,
        reference: pendingTransaction().id,
        amountInCents: 1_200_000,
      });
    writer.updateAfterPayment.mockImplementation(async (transaction) => ({
      dto: { id: transaction.id, status: transaction.status },
      stockDecremented: true,
    }));

    await useCase.execute(pendingTransaction().id, "key-3", syncRequest);

    expect(gateway.getPaymentStatus).toHaveBeenCalledTimes(2);
    expect(writer.updateAfterPayment).toHaveBeenCalledWith(
      expect.objectContaining({ status: TransactionStatus.Approved }),
      { decrementStock: true },
    );
  });

  it("returns out of stock after an approved charge that cannot decrement", async () => {
    gateway.getPaymentStatus.mockResolvedValue({
      providerTransactionId: "wompi_1",
      status: TransactionStatus.Approved,
      reference: pendingTransaction().id,
      amountInCents: 1_200_000,
    });
    writer.updateAfterPayment.mockResolvedValue({
      dto: {
        id: pendingTransaction().id,
        status: TransactionStatus.Error,
      },
      stockDecremented: false,
    });

    const result = await useCase.execute(
      pendingTransaction().id,
      "key-4",
      syncRequest,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("OUT_OF_STOCK");
    }
  });

  it("fails when the provider is unavailable", async () => {
    gateway.getPaymentStatus.mockRejectedValue(new PaymentGatewayError("down"));

    const result = await useCase.execute(
      pendingTransaction().id,
      "key-5",
      syncRequest,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PAYMENT_FAILED");
    }
    expect(idempotency.abort).toHaveBeenCalledWith("key-5");
  });

  it("replays a stored idempotent response", async () => {
    const { createHash } = await import("node:crypto");
    const requestHash = createHash("sha256")
      .update(JSON.stringify({ providerTransactionId: "wompi_1" }))
      .digest("hex");
    const dto = {
      id: pendingTransaction().id,
      status: TransactionStatus.Approved,
    };
    idempotency.find.mockResolvedValue({
      transactionId: pendingTransaction().id,
      requestHash,
      response: dto,
      errorCode: null,
    });

    const result = await useCase.execute(
      pendingTransaction().id,
      "key-replay",
      syncRequest,
    );

    expect(result).toEqual({ ok: true, value: dto });
    expect(idempotency.begin).not.toHaveBeenCalled();
    expect(gateway.getPaymentStatus).not.toHaveBeenCalled();
  });

  it("replays out-of-stock from the idempotency store", async () => {
    const { createHash } = await import("node:crypto");
    const requestHash = createHash("sha256")
      .update(JSON.stringify({ providerTransactionId: "wompi_1" }))
      .digest("hex");
    idempotency.find.mockResolvedValue({
      transactionId: pendingTransaction().id,
      requestHash,
      response: null,
      errorCode: "OUT_OF_STOCK",
    });

    const result = await useCase.execute(
      pendingTransaction().id,
      "key-oos",
      syncRequest,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("OUT_OF_STOCK");
    }
  });

  it("rejects an idempotency key reused with a different body", async () => {
    idempotency.find.mockResolvedValue({
      transactionId: pendingTransaction().id,
      requestHash: "other-hash",
      response: null,
      errorCode: null,
    });

    const result = await useCase.execute(
      pendingTransaction().id,
      "key-body",
      syncRequest,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("IDEMPOTENCY_CONFLICT");
    }
  });

  it("rejects an idempotency key reused for a different transaction", async () => {
    const { createHash } = await import("node:crypto");
    const requestHash = createHash("sha256")
      .update(JSON.stringify({ providerTransactionId: "wompi_1" }))
      .digest("hex");
    idempotency.find.mockResolvedValue({
      transactionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      requestHash,
      response: { id: "other", status: TransactionStatus.Approved },
      errorCode: null,
    });

    const result = await useCase.execute(
      pendingTransaction().id,
      "key-tx",
      syncRequest,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("IDEMPOTENCY_CONFLICT");
    }
  });

  it("rejects an in-progress idempotency record without a response", async () => {
    const { createHash } = await import("node:crypto");
    const requestHash = createHash("sha256")
      .update(JSON.stringify({ providerTransactionId: "wompi_1" }))
      .digest("hex");
    idempotency.find.mockResolvedValue({
      transactionId: pendingTransaction().id,
      requestHash,
      response: null,
      errorCode: null,
    });

    const result = await useCase.execute(
      pendingTransaction().id,
      "key-inflight",
      syncRequest,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("IDEMPOTENCY_CONFLICT");
    }
  });

  it("maps begin conflicts to IdempotencyConflictError", async () => {
    const { IdempotencyConflictError } = await import(
      "../../domain/transaction/errors.js"
    );
    idempotency.begin.mockRejectedValue(new IdempotencyConflictError());

    const result = await useCase.execute(
      pendingTransaction().id,
      "key-begin",
      syncRequest,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("IDEMPOTENCY_CONFLICT");
    }
  });

  it("rethrows unexpected begin errors", async () => {
    idempotency.begin.mockRejectedValue(new Error("db down"));
    await expect(
      useCase.execute(pendingTransaction().id, "key-throw", syncRequest),
    ).rejects.toThrow("db down");
  });

  it("fails when the transaction is missing", async () => {
    transactions.findAggregateById.mockResolvedValue(null);

    const result = await useCase.execute(
      pendingTransaction().id,
      "key-missing",
      syncRequest,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TRANSACTION_NOT_FOUND");
    }
    expect(idempotency.abort).toHaveBeenCalledWith("key-missing");
  });

  it("fails when a terminal charge dto disappears", async () => {
    const approved = pendingTransaction().applyProviderResult(
      "wompi_1",
      TransactionStatus.Approved,
    );
    transactions.findAggregateById.mockResolvedValue(approved);
    transactions.findById.mockResolvedValue(null);

    const result = await useCase.execute(approved.id, "key-gone", syncRequest);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TRANSACTION_NOT_FOUND");
    }
    expect(idempotency.abort).toHaveBeenCalledWith("key-gone");
  });

  it("rejects a foreign provider transaction id", async () => {
    const pending = pendingTransaction();
    const charged = Transaction.rehydrate({
      id: pending.id,
      status: TransactionStatus.Pending,
      lines: pending.lines,
      baseFee: pending.baseFee,
      deliveryFee: pending.deliveryFee,
      total: pending.total,
      customer: pending.customer,
      delivery: pending.delivery,
      createdAt: pending.createdAt,
      providerTransactionId: "wompi_other",
    });
    transactions.findAggregateById.mockResolvedValue(charged);

    const result = await useCase.execute(charged.id, "key-foreign", syncRequest);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_TRANSACTION_STATE");
    }
    expect(idempotency.abort).toHaveBeenCalledWith("key-foreign");
    expect(gateway.getPaymentStatus).not.toHaveBeenCalled();
  });
});
