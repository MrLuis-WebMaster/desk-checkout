import { TypeOrmProductStockReader } from "./typeorm-product-stock-reader";

describe("TypeOrmProductStockReader", () => {
  const qb = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    leftJoin: jest.fn().mockReturnThis(),
  };
  const products = {
    createQueryBuilder: jest.fn(() => qb),
  };
  const reader = new TypeOrmProductStockReader(products as never);

  beforeEach(() => {
    jest.clearAllMocks();
    products.createQueryBuilder.mockReturnValue(qb);
    qb.select.mockReturnThis();
    qb.where.mockReturnThis();
    qb.leftJoin.mockReturnThis();
  });

  it("maps a stock row", async () => {
    qb.getRawOne.mockResolvedValue({
      id: "p1",
      name: "Lamp",
      price: "10000",
      availableStock: "3",
    });
    await expect(reader.findById("p1")).resolves.toEqual({
      id: "p1",
      name: "Lamp",
      price: 10000,
      availableStock: 3,
    });
  });

  it("returns null when missing", async () => {
    qb.getRawOne.mockResolvedValue(undefined);
    await expect(reader.findById("missing")).resolves.toBeNull();
  });
});
