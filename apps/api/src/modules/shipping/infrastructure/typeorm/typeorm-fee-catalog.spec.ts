import { TypeOrmFeeCatalog } from "./typeorm-fee-catalog";

describe("TypeOrmFeeCatalog", () => {
  const settings = { findOne: jest.fn() };
  const methods = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const rates = { findOne: jest.fn() };
  const catalog = new TypeOrmFeeCatalog(
    settings as never,
    methods as never,
    rates as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("reads the base fee setting", async () => {
    settings.findOne.mockResolvedValue({ valueCents: 500 });
    await expect(catalog.getBaseFee()).resolves.toBe(500);
    settings.findOne.mockResolvedValue(null);
    await expect(catalog.getBaseFee()).resolves.toBeNull();
  });

  it("looks up a shipping rate and handles missing method/rate", async () => {
    methods.findOne.mockResolvedValue(null);
    await expect(catalog.getRate("m1", "BOG")).resolves.toEqual({
      methodFound: false,
      amount: null,
    });

    methods.findOne.mockResolvedValue({ id: "m1", active: true });
    rates.findOne.mockResolvedValue({ amountCents: 1500 });
    await expect(catalog.getRate("m1", "BOG")).resolves.toEqual({
      methodFound: true,
      amount: 1500,
    });

    rates.findOne.mockResolvedValue(null);
    await expect(catalog.getRate("m1", "BOG")).resolves.toEqual({
      methodFound: true,
      amount: null,
    });
  });

  it("lists quotes for a city", async () => {
    const qb = {
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { id: "m1", code: "STD", name: "Standard", amount: "1500" },
      ]),
    };
    methods.createQueryBuilder.mockReturnValue(qb);
    await expect(catalog.listQuotes("BOG")).resolves.toEqual([
      { id: "m1", code: "STD", name: "Standard", amount: 1500 },
    ]);
    expect(methods.createQueryBuilder).toHaveBeenCalledWith("method");
    expect(qb.innerJoin).toHaveBeenCalledWith(
      "shipping_rates",
      "rate",
      "rate.shipping_method_id = method.id AND rate.region_code = :city",
      { city: "BOG" },
    );
    expect(qb.select).toHaveBeenCalledWith([
      "method.id AS id",
      "method.code AS code",
      "method.name AS name",
      'rate.amount_cents AS "amount"',
    ]);
    expect(qb.where).toHaveBeenCalledWith("method.active = true");
    expect(qb.orderBy).toHaveBeenCalledWith("rate.amount_cents", "ASC");
  });
});
