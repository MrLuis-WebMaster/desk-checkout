import { describe, expect, it, vi } from "vitest";
import { createSharedCreate } from "./ensure-pending-transaction";

describe("createSharedCreate", () => {
  it("returns existing without calling create", async () => {
    const create = vi.fn();
    const shared = createSharedCreate({
      getExisting: () => ({ id: "tx-1" }),
      create,
    });

    await expect(shared.ensure()).resolves.toEqual({ id: "tx-1" });
    expect(create).not.toHaveBeenCalled();
  });

  it("creates once when concurrent callers race", async () => {
    let resolveCreate!: (value: { id: string }) => void;
    const create = vi.fn(
      () =>
        new Promise<{ id: string }>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const shared = createSharedCreate({
      getExisting: () => null,
      create,
    });

    const first = shared.ensure();
    const second = shared.ensure();
    expect(create).toHaveBeenCalledTimes(1);

    resolveCreate({ id: "tx-new" });
    await expect(first).resolves.toEqual({ id: "tx-new" });
    await expect(second).resolves.toEqual({ id: "tx-new" });
  });

  it("allows a retry after a failed create", async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ id: "tx-2" });
    const shared = createSharedCreate({
      getExisting: () => null,
      create,
    });

    await expect(shared.ensure()).rejects.toThrow("boom");
    await expect(shared.ensure()).resolves.toEqual({ id: "tx-2" });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("reuses getExisting after a successful create clears in-flight", async () => {
    let cached: { id: string } | null = null;
    const create = vi.fn(async () => {
      cached = { id: "tx-3" };
      return cached;
    });
    const shared = createSharedCreate({
      getExisting: () => cached,
      create,
    });

    await expect(shared.ensure()).resolves.toEqual({ id: "tx-3" });
    await expect(shared.ensure()).resolves.toEqual({ id: "tx-3" });
    expect(create).toHaveBeenCalledTimes(1);
  });
});
