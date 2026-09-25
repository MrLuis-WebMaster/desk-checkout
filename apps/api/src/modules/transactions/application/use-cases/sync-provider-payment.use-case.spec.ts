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
  const transactions = { findById: jest.fn(), findAggregateById: jest.fn() };
  const writer = {
    save: jest.fn(),
    claimForPayment: jest.fn(),
    releaseClaim: jest.fn(),
    attachProviderTransactionId: jest.fn(),
    updateAfterPayment: jest.fn(),
  };
  const gateway = {
    getAcceptanceTokens: jest.fn(),
    createCardPayment: jest.fn(),
    createWidgetSession: jest.fn(),
    getPaymentStatus: jest.fn(),
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
      })
      .mockResolvedValueOnce({
        providerTransactionId: "wompi_1",
        status: TransactionStatus.Approved,
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
});
