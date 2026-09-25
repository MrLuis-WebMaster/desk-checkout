import { CreateDeliveryUseCase } from "./create-delivery.use-case";

const METHOD_ID = "22222222-2222-4222-8222-222222222222";

describe("CreateDeliveryUseCase", () => {
  const deliveries = {
    save: jest.fn(),
    findById: jest.fn(),
  };
  const feeCatalog = {
    getBaseFee: jest.fn(),
    getRate: jest.fn(),
    listQuotes: jest.fn(),
  };
  const useCase = new CreateDeliveryUseCase(
    deliveries as never,
    feeCatalog as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("saves when the shipping method is active", async () => {
    const request = {
      shippingMethodId: METHOD_ID,
      addressLine: "Calle 1 #2-3",
      city: "BOG" as const,
    };
    const saved = { id: "del-1", ...request };
    feeCatalog.getRate.mockResolvedValue({ methodFound: true, amount: 5000 });
    deliveries.save.mockResolvedValue(saved);

    await expect(useCase.execute(request)).resolves.toEqual({
      ok: true,
      value: saved,
    });
    expect(feeCatalog.getRate).toHaveBeenCalledWith(METHOD_ID, "BOG");
    expect(deliveries.save).toHaveBeenCalledWith(request);
  });

  it("rejects an inactive or missing shipping method", async () => {
    feeCatalog.getRate.mockResolvedValue({ methodFound: false, amount: null });

    const result = await useCase.execute({
      shippingMethodId: METHOD_ID,
      addressLine: "Calle 1 #2-3",
      city: "BOG",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("SHIPPING_METHOD_NOT_FOUND");
    }
    expect(deliveries.save).not.toHaveBeenCalled();
  });
});
