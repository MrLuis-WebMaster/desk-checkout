import { TypeOrmInventoryWriter } from "./typeorm-inventory-writer";

describe("TypeOrmInventoryWriter", () => {
  const inventoryRepo = {
    createQueryBuilder: jest.fn(),
  };
  const writer = new TypeOrmInventoryWriter(inventoryRepo as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("decrements via update when stock is available", async () => {
    const execute = jest.fn().mockResolvedValue({ affected: 1 });
    inventoryRepo.createQueryBuilder.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute,
    });
    await expect(
      writer.decrementIfAvailable("product-a", 2),
    ).resolves.toBe(true);
    execute.mockResolvedValue({ affected: 0 });
    await expect(
      writer.decrementIfAvailable("product-a", 2),
    ).resolves.toBe(false);
  });

  it("locks and decrements a single line", async () => {
    const entity = { available: 5 };
    const manager = {
      createQueryBuilder: jest.fn(() => ({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(entity),
      })),
      save: jest.fn(async (row: { available: number }) => row),
    };
    await expect(
      writer.decrementLocked(manager as never, "product-a", 2),
    ).resolves.toBe(true);
    expect(entity.available).toBe(3);

    manager.createQueryBuilder.mockReturnValue({
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ available: 1 }),
    });
    await expect(
      writer.decrementLocked(manager as never, "product-a", 2),
    ).resolves.toBe(false);
  });

  it("locks product ids in sorted order and fail-closes on short stock", async () => {
    const lockOrder: string[] = [];
    const rows: Record<string, { available: number }> = {
      "b-id": { available: 5 },
      "a-id": { available: 1 },
    };
    const saves: unknown[] = [];
    const manager = {
      createQueryBuilder: jest.fn(() => {
        const state = { productId: "" };
        return {
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn((_sql: string, params: { productId: string }) => {
            state.productId = params.productId;
            lockOrder.push(params.productId);
            return {
              getOne: jest.fn(async () => rows[state.productId] ?? null),
            };
          }),
        };
      }),
      save: jest.fn(async (entity: unknown) => {
        saves.push(entity);
        return entity;
      }),
    };

    await expect(
      writer.decrementManyLocked(manager as never, [
        { productId: "b-id", quantity: 1 },
        { productId: "a-id", quantity: 1 },
      ]),
    ).resolves.toBe(true);
    expect(lockOrder).toEqual(["a-id", "b-id"]);
    expect(saves).toHaveLength(2);

    lockOrder.length = 0;
    saves.length = 0;
    rows["a-id"] = { available: 0 };
    await expect(
      writer.decrementManyLocked(manager as never, [
        { productId: "b-id", quantity: 1 },
        { productId: "a-id", quantity: 1 },
      ]),
    ).resolves.toBe(false);
    expect(saves).toHaveLength(0);
  });
});
