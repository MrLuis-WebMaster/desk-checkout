import { IdempotencyConflictError } from "@checkout/settlement";
import { TypeOrmIdempotencyStore } from "./typeorm-idempotency-store";

describe("TypeOrmIdempotencyStore", () => {
  const keys = {
    findOne: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const store = new TypeOrmIdempotencyStore(keys as never);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns null when the key is missing", async () => {
    keys.findOne.mockResolvedValue(null);
    await expect(store.find("k")).resolves.toBeNull();
  });

  it("maps a stored row to an idempotency record", async () => {
    keys.findOne.mockResolvedValue({
      transactionId: "tx-1",
      requestHash: "hash",
      responseJson: { id: "tx-1" },
      errorCode: "OUT_OF_STOCK",
    });
    await expect(store.find("k")).resolves.toEqual({
      transactionId: "tx-1",
      requestHash: "hash",
      response: { id: "tx-1" },
      errorCode: "OUT_OF_STOCK",
    });
  });

  it("begins a claim and maps 23505 to IdempotencyConflictError", async () => {
    keys.insert.mockResolvedValue(undefined);
    await store.begin("k", "tx-1", "hash");
    expect(keys.insert).toHaveBeenCalledWith({
      key: "k",
      transactionId: "tx-1",
      requestHash: "hash",
      responseJson: null,
    });

    keys.insert.mockRejectedValue({ code: "23505" });
    await expect(store.begin("k", "tx-1", "hash")).rejects.toBeInstanceOf(
      IdempotencyConflictError,
    );

    keys.insert.mockRejectedValue(new Error("db down"));
    await expect(store.begin("k", "tx-1", "hash")).rejects.toThrow("db down");
  });

  it("completes and aborts keys", async () => {
    await store.complete("k", { id: "tx-1" } as never, "OUT_OF_STOCK");
    expect(keys.update).toHaveBeenCalledWith(
      { key: "k" },
      { responseJson: { id: "tx-1" }, errorCode: "OUT_OF_STOCK" },
    );

    await store.complete("k", { id: "tx-1" } as never);
    expect(keys.update).toHaveBeenCalledWith(
      { key: "k" },
      { responseJson: { id: "tx-1" }, errorCode: null },
    );

    await store.abort("k");
    expect(keys.delete).toHaveBeenCalledWith({ key: "k" });
  });
});
