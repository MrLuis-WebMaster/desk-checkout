import { GetCustomerUseCase } from "./get-customer.use-case";

describe("GetCustomerUseCase", () => {
  const customers = {
    save: jest.fn(),
    findById: jest.fn(),
  };
  const useCase = new GetCustomerUseCase(customers as never);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns a customer when found", async () => {
    const dto = {
      id: "cust-1",
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+573001112233",
    };
    customers.findById.mockResolvedValue(dto);

    await expect(useCase.execute("cust-1")).resolves.toEqual({
      ok: true,
      value: dto,
    });
  });

  it("returns not found when missing", async () => {
    customers.findById.mockResolvedValue(null);
    const result = await useCase.execute("missing");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CUSTOMER_NOT_FOUND");
    }
  });
});
