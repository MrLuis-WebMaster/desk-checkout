import { GetDeliveryUseCase } from "./get-delivery.use-case";

describe("GetDeliveryUseCase", () => {
  const deliveries = {
    save: jest.fn(),
    findById: jest.fn(),
  };
  const useCase = new GetDeliveryUseCase(deliveries as never);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns a delivery when found", async () => {
    const dto = {
      id: "del-1",
      shippingMethodId: "22222222-2222-4222-8222-222222222222",
      addressLine: "Calle 1 #2-3",
      city: "BOG" as const,
    };
    deliveries.findById.mockResolvedValue(dto);

    await expect(useCase.execute("del-1")).resolves.toEqual({
      ok: true,
      value: dto,
    });
  });

  it("returns not found when missing", async () => {
    deliveries.findById.mockResolvedValue(null);
    const result = await useCase.execute("missing");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DELIVERY_NOT_FOUND");
    }
  });
});
