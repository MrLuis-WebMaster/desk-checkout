import { TransactionStatus } from "@checkout/contracts";
import { Money } from "#shared/domain/money.js";
import type { PaymentGateway } from "#modules/payments/application/ports/payment-gateway.port.js";
import { Transaction } from "../../domain/transaction/transaction.js";
import type { TransactionReader } from "../ports/transaction-reader.port.js";
import { GetWidgetCheckoutSessionUseCase } from "./get-widget-checkout-session.use-case.js";

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

describe("GetWidgetCheckoutSessionUseCase", () => {
  const transactions = { findById: jest.fn(), findAggregateById: jest.fn() };
  const gateway = {
    getAcceptanceTokens: jest.fn(),
    createCardPayment: jest.fn(),
    createWidgetSession: jest.fn(),
    getPaymentStatus: jest.fn(),
  };
  const useCase = new GetWidgetCheckoutSessionUseCase(
    transactions as TransactionReader,
    gateway as PaymentGateway,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    transactions.findAggregateById.mockResolvedValue(pendingTransaction());
    gateway.createWidgetSession.mockReturnValue({
      publicKey: "pub_test",
      amountInCents: 1_200_000,
      currency: "COP",
      reference: pendingTransaction().id,
      signature: "sig",
    });
  });

  it("returns a signed widget session for a pending transaction", async () => {
    const result = await useCase.execute(pendingTransaction().id);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        publicKey: "pub_test",
        amountInCents: 1_200_000,
        currency: "COP",
        reference: pendingTransaction().id,
        signature: "sig",
      });
    }
    expect(gateway.createWidgetSession).toHaveBeenCalledWith({
      reference: pendingTransaction().id,
      amountInCents: 1_200_000,
      currency: "COP",
    });
  });

  it("rejects when the transaction is missing", async () => {
    transactions.findAggregateById.mockResolvedValue(null);

    const result = await useCase.execute(pendingTransaction().id);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TRANSACTION_NOT_FOUND");
    }
  });

  it("rejects when a provider charge already exists", async () => {
    const charged = Transaction.rehydrate({
      id: pendingTransaction().id,
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
      customer: pendingTransaction().customer,
      delivery: pendingTransaction().delivery,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      providerTransactionId: "wompi_1",
    });
    transactions.findAggregateById.mockResolvedValue(charged);

    const result = await useCase.execute(charged.id);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_TRANSACTION_STATE");
    }
    expect(gateway.createWidgetSession).not.toHaveBeenCalled();
  });
});
