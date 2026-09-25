import { GetProductUseCase } from "./get-product.use-case";

describe("GetProductUseCase", () => {
  const productReader = {
    list: jest.fn(),
    findById: jest.fn(),
  };
  const useCase = new GetProductUseCase(productReader as never);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns a product when found", async () => {
    const product = {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Lamp",
      description: "Bright",
      price: 10000,
      imageUrl: "/lamp.jpg",
      availableStock: 3,
    };
    productReader.findById.mockResolvedValue(product);
    const result = await useCase.execute(product.id);
    expect(result).toEqual({ ok: true, value: product });
  });

  it("returns not found when missing", async () => {
    productReader.findById.mockResolvedValue(null);
    const result = await useCase.execute("missing");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PRODUCT_NOT_FOUND");
    }
  });
});
