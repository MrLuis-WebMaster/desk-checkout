import {
  AVAILABLE_STOCK_COLUMN,
  joinAvailableStock,
} from "./product-stock.query";

describe("product-stock.query", () => {
  it("exposes the available stock select alias", () => {
    expect(AVAILABLE_STOCK_COLUMN).toContain("availableStock");
  });

  it("left-joins inventory on product id", () => {
    const qb = {
      leftJoin: jest.fn().mockReturnThis(),
    };
    expect(joinAvailableStock(qb as never)).toBe(qb);
    expect(qb.leftJoin).toHaveBeenCalledWith(
      "inventory",
      "inventory",
      "inventory.product_id = product.id",
    );
  });
});
