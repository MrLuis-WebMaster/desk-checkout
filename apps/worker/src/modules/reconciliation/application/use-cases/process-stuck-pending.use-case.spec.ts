import { TransactionStatus } from "@checkout/contracts";
import {
  Money,
  NoopSettlementLogger,
  Transaction,
  type SettlementPaymentGateway,
  type IdempotencyStore,
  type SettleProviderPaymentService,
  type TransactionReader,
} from "@checkout/settlement";
import { ProcessStuckPendingUseCase } from "./process-stuck-pending.use-case.js";

function stuckTransaction() {
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
    providerTransactionId: "wompi_stuck",
  });
}

describe("ProcessStuckPendingUseCase", () => {
  const transactions = {
    findById: jest.fn(),
    findAggregateById: jest.fn(),
    findAggregateByProviderId: jest.fn(),
    listStuckPending: jest.fn(),
    listOrphanPending: jest.fn(),
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
  const settlement = {
    pollUntilResolved: jest.fn(),
    settle: jest.fn(),
  };

  const useCase = new ProcessStuckPendingUseCase(
    transactions as TransactionReader,
    gateway as SettlementPaymentGateway,
    idempotency as IdempotencyStore,
    settlement as unknown as SettleProviderPaymentService,
    new NoopSettlementLogger(),
    120_000,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    idempotency.find.mockResolvedValue(null);
    idempotency.begin.mockResolvedValue(undefined);
    settlement.settle.mockResolvedValue({ ok: true, value: {} });
  });

  it("fetches provider status once and settles without polling", async () => {
    transactions.listStuckPending.mockResolvedValue([stuckTransaction()]);
    gateway.getPaymentStatus.mockResolvedValue({
      providerTransactionId: "wompi_stuck",
      status: TransactionStatus.Approved,
      reference: stuckTransaction().id,
      amountInCents: 1_200_000,
    });

    const recovered = await useCase.execute(new Date("2026-01-01T01:00:00.000Z"));

    expect(recovered).toBe(1);
    expect(gateway.getPaymentStatus).toHaveBeenCalledTimes(1);
    expect(settlement.settle).toHaveBeenCalledWith(
      expect.objectContaining({ id: stuckTransaction().id }),
      expect.objectContaining({ status: TransactionStatus.Approved }),
      "stuck:wompi_stuck:APPROVED",
      "stuck_job",
    );
    expect(settlement.pollUntilResolved).not.toHaveBeenCalled();
  });

  it("skips settlement when provider reference/amount do not bind", async () => {
    transactions.listStuckPending.mockResolvedValue([stuckTransaction()]);
    gateway.getPaymentStatus.mockResolvedValue({
      providerTransactionId: "wompi_stuck",
      status: TransactionStatus.Approved,
      reference: "other-order",
      amountInCents: 1_200_000,
    });

    const recovered = await useCase.execute(new Date("2026-01-01T01:00:00.000Z"));

    expect(recovered).toBe(0);
    expect(settlement.settle).not.toHaveBeenCalled();
  });
});
