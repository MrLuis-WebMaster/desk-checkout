import { TransactionStatus } from "@checkout/contracts";
import { Money } from "../money.js";
import { InvalidTransactionStateError } from "./errors.js";
import { Transaction } from "./transaction.js";

function baseProps(overrides: Partial<Parameters<typeof Transaction.rehydrate>[0]> = {}) {
  return {
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
      city: "BOG" as const,
    },
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    providerTransactionId: null as string | null,
    ...overrides,
  };
}

describe("Transaction.expireUncharged", () => {
  it("expires pending without a provider charge", () => {
    const expired = Transaction.rehydrate(baseProps()).expireUncharged();
    expect(expired.status).toBe(TransactionStatus.Expired);
    expect(expired.providerTransactionId).toBeNull();
  });

  it("expires pending with a stale claim and clears the claim", () => {
    const expired = Transaction.rehydrate(
      baseProps({ providerTransactionId: "claim:33333333-3333-4333-8333-333333333333" }),
    ).expireUncharged();
    expect(expired.status).toBe(TransactionStatus.Expired);
    expect(expired.providerTransactionId).toBeNull();
  });

  it("rejects charged pending", () => {
    expect(() =>
      Transaction.rehydrate(
        baseProps({ providerTransactionId: "wompi_real" }),
      ).expireUncharged(),
    ).toThrow(InvalidTransactionStateError);
  });
});

describe("Transaction.markSettlementError", () => {
  it("marks approved with a real provider id as Error", () => {
    const errored = Transaction.rehydrate(
      baseProps({
        status: TransactionStatus.Approved,
        providerTransactionId: "wompi_real",
      }),
    ).markSettlementError();
    expect(errored.status).toBe(TransactionStatus.Error);
    expect(errored.providerTransactionId).toBe("wompi_real");
  });

  it("rejects pending", () => {
    expect(() =>
      Transaction.rehydrate(baseProps()).markSettlementError(),
    ).toThrow(InvalidTransactionStateError);
  });

  it("rejects approved without a real provider charge", () => {
    expect(() =>
      Transaction.rehydrate(
        baseProps({
          status: TransactionStatus.Approved,
          providerTransactionId: null,
        }),
      ).markSettlementError(),
    ).toThrow(InvalidTransactionStateError);
  });
});
