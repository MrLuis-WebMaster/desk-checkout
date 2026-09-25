import { decrementManyLocked } from "./decrement-many-locked";

describe("decrementManyLocked", () => {
  function mockManager(rows: Record<string, { available: number }>) {
    const saves: Array<{ available: number }> = [];
    const lockOrder: string[] = [];
    const manager = {
      createQueryBuilder: jest.fn(() => {
        const state = { productId: "" };
        return {
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn((_sql: string, params: { productId: string }) => {
            state.productId = params.productId;
            lockOrder.push(params.productId);
            return {
              getOne: jest.fn(async () => {
                const row = rows[state.productId];
                return row
                  ? { productId: state.productId, available: row.available }
                  : null;
              }),
            };
          }),
        };
      }),
      save: jest.fn(async (entity: { available: number }) => {
        saves.push(entity);
        return entity;
      }),
    };
    return { manager, saves, lockOrder };
  }

  it("locks product ids in sorted order before decrementing", async () => {
    const { manager, lockOrder, saves } = mockManager({
      "b-product": { available: 5 },
      "a-product": { available: 3 },
    });

    const ok = await decrementManyLocked(manager as never, [
      { productId: "b-product", quantity: 2 },
      { productId: "a-product", quantity: 1 },
    ]);

    expect(ok).toBe(true);
    expect(lockOrder).toEqual(["a-product", "b-product"]);
    expect(saves.map((row) => row.available)).toEqual([2, 3]);
  });

  it("fail-closes without saving when any line is short on stock", async () => {
    const { manager, saves } = mockManager({
      "a-product": { available: 1 },
      "b-product": { available: 0 },
    });

    const ok = await decrementManyLocked(manager as never, [
      { productId: "a-product", quantity: 1 },
      { productId: "b-product", quantity: 1 },
    ]);

    expect(ok).toBe(false);
    expect(saves).toHaveLength(0);
  });

  it("fail-closes when inventory is missing", async () => {
    const { manager, saves } = mockManager({});
    const ok = await decrementManyLocked(manager as never, [
      { productId: "missing", quantity: 1 },
    ]);
    expect(ok).toBe(false);
    expect(saves).toHaveLength(0);
  });
});
