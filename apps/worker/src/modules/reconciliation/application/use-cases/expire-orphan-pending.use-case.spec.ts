import { TransactionStatus } from "@checkout/contracts";
import {
  Money,
  NoopSettlementLogger,
  Transaction,
  type TransactionReader,
  type TransactionWriter,
} from "@checkout/settlement";
import { ExpireOrphanPendingUseCase } from "./expire-orphan-pending.use-case.js";

function orphanTransaction() {
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
    providerTransactionId: "claim:33333333-3333-4333-8333-333333333333",
  });
}

describe("ExpireOrphanPendingUseCase", () => {
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

  const useCase = new ExpireOrphanPendingUseCase(
    transactions as TransactionReader,
    writer as TransactionWriter,
    new NoopSettlementLogger(),
    1_800_000,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("expires orphans via writer CAS with the domain aggregate", async () => {
    transactions.listOrphanPending.mockResolvedValue([orphanTransaction()]);
    writer.expireUncharged.mockResolvedValue(true);

    const expired = await useCase.execute(
      new Date("2026-01-01T01:00:00.000Z"),
    );

    expect(expired).toBe(1);
    expect(writer.expireUncharged).toHaveBeenCalledWith(
      expect.objectContaining({
        id: orphanTransaction().id,
        status: TransactionStatus.Expired,
        providerTransactionId: null,
      }),
    );
  });
});
