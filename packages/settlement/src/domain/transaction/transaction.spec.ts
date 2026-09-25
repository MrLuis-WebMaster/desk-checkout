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

describe("Transaction.createPending", () => {
  it("creates a pending order and normalizes quantity", () => {
    const created = Transaction.createPending({
      lines: [
        {
          productId: "11111111-1111-4111-8111-111111111111",
          productName: "Lamp",
          productPrice: Money.create(10000),
          quantity: 0,
        },
        {
          productId: "22222222-2222-4222-8222-222222222222",
          productName: "Desk",
          productPrice: Money.create(20000),
          quantity: 2,
        },
      ],
      baseFee: Money.create(500),
      deliveryFee: Money.create(1500),
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
    });

    expect(created.status).toBe(TransactionStatus.Pending);
    expect(created.providerTransactionId).toBeNull();
    expect(created.lines[0]?.quantity).toBe(1);
    expect(created.productName).toBe("Lamp +1 more");
    expect(created.canStartPayment()).toBe(true);
  });

  it("rejects an empty line list", () => {
    expect(() =>
      Transaction.createPending({
        lines: [],
        baseFee: Money.create(0),
        deliveryFee: Money.create(0),
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
      }),
    ).toThrow(/at least one line/);
  });
});

describe("Transaction getters", () => {
  it("falls back when lines are empty after rehydrate", () => {
    const empty = Transaction.rehydrate(baseProps({ lines: [] }));
    expect(empty.productId).toBe("");
    expect(empty.productName).toBe("");
    expect(empty.productPrice.amount).toBe(0);
    expect(empty.quantity).toBe(1);
  });

  it("returns the single-line product name", () => {
    expect(Transaction.rehydrate(baseProps()).productName).toBe("Lamp");
  });
});

describe("Transaction.applyProviderResult", () => {
  it("binds a first provider result on pending", () => {
    const settled = Transaction.rehydrate(baseProps()).applyProviderResult(
      "wompi_1",
      TransactionStatus.Approved,
    );
    expect(settled.status).toBe(TransactionStatus.Approved);
    expect(settled.providerTransactionId).toBe("wompi_1");
    expect(settled.canStartPayment()).toBe(false);
  });

  it("is idempotent for the same provider id and status", () => {
    const first = Transaction.rehydrate(baseProps()).applyProviderResult(
      "wompi_1",
      TransactionStatus.Approved,
    );
    expect(first.applyProviderResult("wompi_1", TransactionStatus.Approved)).toBe(
      first,
    );
  });

  it("allows pending with a bound provider id to move to a terminal status", () => {
    const pendingBound = Transaction.rehydrate(
      baseProps({ providerTransactionId: "wompi_1" }),
    ).applyProviderResult("wompi_1", TransactionStatus.Pending);
    const approved = pendingBound.applyProviderResult(
      "wompi_1",
      TransactionStatus.Approved,
    );
    expect(approved.status).toBe(TransactionStatus.Approved);
  });

  it("rejects a foreign provider id or terminal status change", () => {
    const approved = Transaction.rehydrate(baseProps()).applyProviderResult(
      "wompi_1",
      TransactionStatus.Approved,
    );
    expect(() =>
      approved.applyProviderResult("wompi_other", TransactionStatus.Declined),
    ).toThrow(InvalidTransactionStateError);
    expect(() =>
      approved.applyProviderResult("wompi_1", TransactionStatus.Declined),
    ).toThrow(InvalidTransactionStateError);
  });

  it("rejects applying a provider result on a non-pending unbound order", () => {
    const expired = Transaction.rehydrate(
      baseProps({ status: TransactionStatus.Expired }),
    );
    expect(() =>
      expired.applyProviderResult("wompi_1", TransactionStatus.Approved),
    ).toThrow(InvalidTransactionStateError);
  });
});

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
