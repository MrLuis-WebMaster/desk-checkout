import { CreateCustomerUseCase } from "./create-customer.use-case";

describe("CreateCustomerUseCase", () => {
  const customers = {
    save: jest.fn(),
    findById: jest.fn(),
  };
  const useCase = new CreateCustomerUseCase(customers as never);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("saves and returns the customer", async () => {
    const request = {
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+573001112233",
    };
    const saved = { id: "cust-1", ...request };
    customers.save.mockResolvedValue(saved);

    await expect(useCase.execute(request)).resolves.toEqual({
      ok: true,
      value: saved,
    });
    expect(customers.save).toHaveBeenCalledWith(request);
  });
});
