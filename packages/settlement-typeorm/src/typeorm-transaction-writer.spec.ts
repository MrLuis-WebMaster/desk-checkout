import { TransactionStatus } from "@checkout/contracts";
import { Money, Transaction } from "@checkout/settlement";
import { IsNull } from "typeorm";
import { TypeOrmTransactionWriter } from "./typeorm-transaction-writer";

function pendingTransaction(overrides: { providerTransactionId?: string | null } = {}) {
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
    providerTransactionId: overrides.providerTransactionId ?? null,
  });
}

describe("TypeOrmTransactionWriter", () => {
  const repo = {
    update: jest.fn(),
    findOne: jest.fn(),
  };
  const queryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    isTransactionActive: true,
    manager: {
      create: jest.fn((_Entity: unknown, data: unknown) => data),
      save: jest.fn(async (entity: unknown) => ({
        ...(entity as object),
        id: "saved-id",
      })),
      createQueryBuilder: jest.fn(),
      update: jest.fn(),
    },
  };
  const qb = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  };
  const dataSource = {
    getRepository: jest.fn(() => repo),
    createQueryBuilder: jest.fn(() => qb),
    createQueryRunner: jest.fn(() => queryRunner),
  };
  const stockDecrementer = jest.fn();
  const writer = new TypeOrmTransactionWriter(
    dataSource as never,
    stockDecrementer,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    queryRunner.isTransactionActive = true;
    dataSource.getRepository.mockReturnValue(repo);
    dataSource.createQueryBuilder.mockReturnValue(qb);
    dataSource.createQueryRunner.mockReturnValue(queryRunner);
    qb.update.mockReturnThis();
    qb.set.mockReturnThis();
    qb.where.mockReturnThis();
    qb.andWhere.mockReturnThis();
  });

  it("claims, releases, and attaches provider ids", async () => {
    repo.update.mockResolvedValue({ affected: 1 });
    await expect(
      writer.claimForPayment(pendingTransaction().id),
    ).resolves.toBe(true);
    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: pendingTransaction().id,
        status: TransactionStatus.Pending,
        providerTransactionId: IsNull(),
      }),
      expect.objectContaining({
        providerTransactionId: `claim:${pendingTransaction().id}`,
      }),
    );

    repo.update.mockResolvedValue({ affected: 0 });
    await expect(writer.claimForPayment("x")).resolves.toBe(false);

    await writer.releaseClaim(pendingTransaction().id);
    await writer.attachProviderTransactionId(
      pendingTransaction().id,
      "wompi_1",
    );
    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        providerTransactionId: `claim:${pendingTransaction().id}`,
      }),
      expect.objectContaining({ providerTransactionId: "wompi_1" }),
    );
  });

  it("expires only null or stale claim leases", async () => {
    const leaseBefore = new Date("2026-01-01T01:00:00.000Z");
    qb.execute.mockResolvedValue({ affected: 1 });
    const expired = pendingTransaction().expireUncharged();

    await expect(
      writer.expireUncharged(expired, { claimLeaseBefore: leaseBefore }),
    ).resolves.toBe(true);

    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining("provider_transaction_id LIKE :claimPrefix"),
      expect.objectContaining({
        claimPrefix: "claim:%",
        claimLeaseBefore: leaseBefore,
      }),
    );

    qb.execute.mockResolvedValue({ affected: 0 });
    await expect(
      writer.expireUncharged(expired, { claimLeaseBefore: leaseBefore }),
    ).resolves.toBe(false);
  });

  it("saves a new transaction and rolls back on failure", async () => {
    await expect(writer.save(pendingTransaction())).resolves.toMatchObject({
      id: pendingTransaction().id,
      status: TransactionStatus.Pending,
    });
    expect(queryRunner.commitTransaction).toHaveBeenCalled();

    queryRunner.manager.save.mockRejectedValueOnce(new Error("save failed"));
    await expect(writer.save(pendingTransaction())).rejects.toThrow(
      "save failed",
    );
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
  });

  it("decrements stock on approved settlement", async () => {
    const approved = pendingTransaction().applyProviderResult(
      "wompi_1",
      TransactionStatus.Approved,
    );
    const lockQb = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: approved.id,
        status: TransactionStatus.Pending,
        providerTransactionId: `claim:${approved.id}`,
      }),
    };
    queryRunner.manager.createQueryBuilder.mockReturnValue(lockQb);
    stockDecrementer.mockResolvedValue(true);
    queryRunner.manager.update.mockResolvedValue({ affected: 1 });

    const settlement = await writer.updateAfterPayment(approved, {
      decrementStock: true,
    });

    expect(stockDecrementer).toHaveBeenCalled();
    expect(settlement.stockDecremented).toBe(true);
    expect(settlement.dto.status).toBe(TransactionStatus.Approved);
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });

  it("marks settlement error when stock cannot decrement", async () => {
    const approved = pendingTransaction().applyProviderResult(
      "wompi_1",
      TransactionStatus.Approved,
    );
    queryRunner.manager.createQueryBuilder.mockReturnValue({
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: approved.id,
        status: TransactionStatus.Pending,
        providerTransactionId: null,
      }),
    });
    stockDecrementer.mockResolvedValue(false);
    queryRunner.manager.update.mockResolvedValue({ affected: 1 });

    const settlement = await writer.updateAfterPayment(approved, {
      decrementStock: true,
    });

    expect(settlement.stockDecremented).toBe(false);
    expect(settlement.dto.status).toBe(TransactionStatus.Error);
  });

  it("returns the winner when CAS loses after a concurrent settle", async () => {
    const approved = pendingTransaction().applyProviderResult(
      "wompi_1",
      TransactionStatus.Approved,
    );
    queryRunner.manager.createQueryBuilder.mockReturnValue({
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: approved.id,
        status: TransactionStatus.Pending,
        providerTransactionId: null,
      }),
    });
    stockDecrementer.mockResolvedValue(true);
    queryRunner.manager.update.mockResolvedValue({ affected: 0 });
    repo.findOne.mockResolvedValue({
      id: approved.id,
      status: TransactionStatus.Approved,
      providerTransactionId: "wompi_1",
    });

    const settlement = await writer.updateAfterPayment(approved, {
      decrementStock: true,
    });

    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(settlement.stockDecremented).toBe(true);
    expect(settlement.dto.status).toBe(TransactionStatus.Approved);
  });

  it("returns an already-settled row without re-decrementing", async () => {
    const approved = pendingTransaction().applyProviderResult(
      "wompi_1",
      TransactionStatus.Approved,
    );
    queryRunner.manager.createQueryBuilder.mockReturnValue({
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: approved.id,
        status: TransactionStatus.Approved,
        providerTransactionId: "wompi_1",
      }),
    });

    const settlement = await writer.updateAfterPayment(approved, {
      decrementStock: true,
    });

    expect(stockDecrementer).not.toHaveBeenCalled();
    expect(settlement.stockDecremented).toBe(true);
    expect(settlement.dto.status).toBe(TransactionStatus.Approved);
  });

  it("throws when the transaction row is missing", async () => {
    queryRunner.manager.createQueryBuilder.mockReturnValue({
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    });

    await expect(
      writer.updateAfterPayment(pendingTransaction(), { decrementStock: false }),
    ).rejects.toThrow(/not found/);
  });
});
