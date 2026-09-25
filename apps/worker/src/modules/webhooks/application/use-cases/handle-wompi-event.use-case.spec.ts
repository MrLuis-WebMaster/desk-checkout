import { TransactionStatus } from "@checkout/contracts";
import {
  Money,
  NoopSettlementLogger,
  SettleProviderPaymentService,
  Transaction,
  type IdempotencyStore,
  type SettlementPaymentGateway,
  type TransactionReader,
  type TransactionWriter,
} from "@checkout/settlement";
import { HandleWompiEventUseCase } from "./handle-wompi-event.use-case.js";

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

describe("HandleWompiEventUseCase", () => {
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
    gateway as SettlementPaymentGateway,
    idempotency as IdempotencyStore,
    new NoopSettlementLogger(),
    { pollAttempts: 5, pollDelayMs: 0 },
  );
  const useCase = new HandleWompiEventUseCase(
    transactions as TransactionReader,
    idempotency as IdempotencyStore,
    settlement,
    gateway as SettlementPaymentGateway,
    new NoopSettlementLogger(),
    { attempts: 5, delayMs: 0 },
  );

  beforeEach(() => {
    jest.resetAllMocks();
    idempotency.find.mockResolvedValue(null);
    idempotency.begin.mockResolvedValue(undefined);
    idempotency.complete.mockResolvedValue(undefined);
    writer.updateAfterPayment.mockImplementation(async (transaction) => ({
      dto: { id: transaction.id, status: transaction.status },
      stockDecremented: true,
    }));
    transactions.findAggregateByProviderId.mockResolvedValue(
      pendingTransaction(),
    );
  });

  it("settles a validated transaction.updated event", async () => {
    const result = await useCase.execute({
      providerId: "wompi_1",
      status: TransactionStatus.Approved,
      reference: pendingTransaction().id,
      amountInCents: 1_200_000,
    });
    expect(result).toEqual({ outcome: "accepted" });
    expect(writer.updateAfterPayment).toHaveBeenCalled();
    expect(idempotency.begin).toHaveBeenCalledWith(
      "webhook:wompi_1:APPROVED",
      pendingTransaction().id,
      "webhook:wompi_1:APPROVED",
    );
  });

  it("is idempotent on replay", async () => {
    idempotency.find.mockResolvedValue({
      transactionId: pendingTransaction().id,
      requestHash: "webhook:wompi_1:APPROVED",
      response: {
        id: pendingTransaction().id,
        status: TransactionStatus.Approved,
      },
      errorCode: null,
    });
    const result = await useCase.execute({
      providerId: "wompi_1",
      status: TransactionStatus.Approved,
      reference: pendingTransaction().id,
      amountInCents: 1_200_000,
    });
    expect(result).toEqual({ outcome: "accepted" });
    expect(writer.updateAfterPayment).not.toHaveBeenCalled();
  });

  it("waits for an in-flight idempotency key before accepting", async () => {
    const { IdempotencyConflictError } = await import("@checkout/settlement");
    idempotency.begin.mockRejectedValue(new IdempotencyConflictError());
    idempotency.find
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        transactionId: pendingTransaction().id,
        requestHash: "webhook:wompi_1:APPROVED",
        response: null,
        errorCode: null,
      })
      .mockResolvedValueOnce({
        transactionId: pendingTransaction().id,
        requestHash: "webhook:wompi_1:APPROVED",
        response: {
          id: pendingTransaction().id,
          status: TransactionStatus.Approved,
        },
        errorCode: null,
      });

    const result = await useCase.execute({
      providerId: "wompi_1",
      status: TransactionStatus.Approved,
      reference: pendingTransaction().id,
      amountInCents: 1_200_000,
    });

    expect(result).toEqual({ outcome: "accepted" });
    expect(writer.updateAfterPayment).not.toHaveBeenCalled();
    expect(idempotency.find).toHaveBeenCalledTimes(3);
  });

  it("no-ops on amount mismatch", async () => {
    const result = await useCase.execute({
      providerId: "wompi_1",
      status: TransactionStatus.Approved,
      reference: pendingTransaction().id,
      amountInCents: 999,
    });
    expect(result).toEqual({ outcome: "ignored", reason: "amount_mismatch" });
    expect(writer.updateAfterPayment).not.toHaveBeenCalled();
  });

  it("no-ops when amount is omitted", async () => {
    const result = await useCase.execute({
      providerId: "wompi_1",
      status: TransactionStatus.Approved,
      reference: pendingTransaction().id,
    });
    expect(result).toEqual({ outcome: "ignored", reason: "amount_mismatch" });
    expect(writer.updateAfterPayment).not.toHaveBeenCalled();
  });

  it("ignores a tampered unsigned reference that points at another order", async () => {
    const victim = pendingTransaction();
    const bound = Transaction.rehydrate({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      status: TransactionStatus.Pending,
      lines: victim.lines,
      baseFee: victim.baseFee,
      deliveryFee: victim.deliveryFee,
      total: victim.total,
      customer: victim.customer,
      delivery: victim.delivery,
      createdAt: victim.createdAt,
      providerTransactionId: "wompi_1",
    });
    transactions.findAggregateByProviderId.mockResolvedValue(bound);
    const result = await useCase.execute({
      providerId: "wompi_1",
      status: TransactionStatus.Approved,
      reference: victim.id,
      amountInCents: 1_200_000,
    });
    expect(result).toEqual({
      outcome: "ignored",
      reason: "reference_mismatch",
    });
    expect(writer.updateAfterPayment).not.toHaveBeenCalled();
  });

  it("verifies provider truth before settling via reference-only lookup", async () => {
    transactions.findAggregateByProviderId.mockResolvedValue(null);
    transactions.findAggregateById.mockResolvedValue(pendingTransaction());
    gateway.getPaymentStatus.mockResolvedValue({
      providerTransactionId: "wompi_1",
      status: TransactionStatus.Approved,
      reference: pendingTransaction().id,
      amountInCents: 1_200_000,
    });

    const result = await useCase.execute({
      providerId: "wompi_1",
      status: TransactionStatus.Approved,
      reference: pendingTransaction().id,
      amountInCents: 1_200_000,
    });

    expect(result).toEqual({ outcome: "accepted" });
    expect(gateway.getPaymentStatus).toHaveBeenCalledWith("wompi_1");
    expect(writer.updateAfterPayment).toHaveBeenCalled();
  });

  it("rejects reference-only lookup when provider reference differs", async () => {
    transactions.findAggregateByProviderId.mockResolvedValue(null);
    transactions.findAggregateById.mockResolvedValue(pendingTransaction());
    gateway.getPaymentStatus.mockResolvedValue({
      providerTransactionId: "wompi_1",
      status: TransactionStatus.Approved,
      reference: "other-order",
      amountInCents: 1_200_000,
    });

    const result = await useCase.execute({
      providerId: "wompi_1",
      status: TransactionStatus.Approved,
      reference: pendingTransaction().id,
      amountInCents: 1_200_000,
    });

    expect(result).toEqual({
      outcome: "ignored",
      reason: "reference_mismatch",
    });
    expect(writer.updateAfterPayment).not.toHaveBeenCalled();
  });

  it("ignores missing transactions", async () => {
    transactions.findAggregateByProviderId.mockResolvedValue(null);
    transactions.findAggregateById.mockResolvedValue(null);
    const result = await useCase.execute({
      providerId: "wompi_missing",
      status: TransactionStatus.Approved,
      amountInCents: 1_200_000,
    });
    expect(result).toEqual({
      outcome: "ignored",
      reason: "transaction_not_found",
    });
  });
});
