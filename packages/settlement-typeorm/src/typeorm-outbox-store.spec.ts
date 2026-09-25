import { TypeOrmOutboxStore } from "./typeorm-outbox-store.js";

describe("TypeOrmOutboxStore", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  const save = jest.fn(async (row: unknown) => row);
  const queryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    isTransactionActive: true,
    manager: {
      createQueryBuilder: jest.fn(),
      save,
    },
  };
  const repo = {
    update: jest.fn(),
  };
  const dataSource = {
    createQueryRunner: jest.fn(() => queryRunner),
    getRepository: jest.fn(() => repo),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryRunner.isTransactionActive = true;
  });

  it("claims unpublished unlocked rows with a lease", async () => {
    const lockedUntil = new Date(now.getTime() + 30_000);
    const qb = {
      setLock: jest.fn().mockReturnThis(),
      setOnLocked: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: "o1",
          type: "order.confirmed",
          aggregateId: "t1",
          payload: { eventId: "e1" },
          attempts: 0,
          lockedUntil: null,
        },
      ]),
    };
    queryRunner.manager.createQueryBuilder.mockReturnValue(qb);
    const store = new TypeOrmOutboxStore(dataSource as never, {
      leaseMs: 30_000,
      now: () => now,
    });

    const claimed = await store.claimBatch(10);
    expect(claimed).toEqual([
      {
        id: "o1",
        type: "order.confirmed",
        aggregateId: "t1",
        payload: { eventId: "e1" },
        lockedUntil,
      },
    ]);
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ attempts: 1, lockedUntil }),
    );
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });

  it("marks published only when the lease matches", async () => {
    const lockedUntil = new Date(now.getTime() + 30_000);
    repo.update.mockResolvedValue({ affected: 1 });
    const store = new TypeOrmOutboxStore(dataSource as never, {
      now: () => now,
    });
    await expect(store.markPublished("o1", lockedUntil)).resolves.toBe(true);
    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "o1", lockedUntil }),
      expect.objectContaining({ publishedAt: now, lockedUntil: null }),
    );
  });

  it("releases the lease and schedules availability on broker failure", async () => {
    const lockedUntil = new Date(now.getTime() + 30_000);
    repo.update.mockResolvedValue({ affected: 1 });
    const store = new TypeOrmOutboxStore(dataSource as never, {
      retryDelayMs: 5_000,
      now: () => now,
    });
    await store.releaseOnFailure("o1", lockedUntil);
    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "o1", lockedUntil }),
      expect.objectContaining({
        lockedUntil: null,
        availableAt: new Date(now.getTime() + 5_000),
      }),
    );
  });
});
