import { GetTransactionUseCase } from "./get-transaction.use-case";

describe("GetTransactionUseCase", () => {
  const transactions = {
    findById: jest.fn(),
    findAggregateById: jest.fn(),
    findAggregateByProviderId: jest.fn(),
    listStuckPending: jest.fn(),
    listOrphanPending: jest.fn(),
  };
  const useCase = new GetTransactionUseCase(transactions as never);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns a transaction dto when found", async () => {
    const dto = { id: "tx-1", status: "PENDING" };
    transactions.findById.mockResolvedValue(dto);
    await expect(useCase.execute("tx-1")).resolves.toEqual({
      ok: true,
      value: dto,
    });
  });

  it("returns not found when missing", async () => {
    transactions.findById.mockResolvedValue(null);
    const result = await useCase.execute("missing");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TRANSACTION_NOT_FOUND");
    }
  });
});
