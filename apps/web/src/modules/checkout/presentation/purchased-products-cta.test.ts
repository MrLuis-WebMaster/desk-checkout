import { describe, expect, it } from "vitest";
import { purchasedProductsCta } from "./purchased-products-cta";

describe("purchasedProductsCta", () => {
  it("returns null when there are no product ids", () => {
    expect(purchasedProductsCta([])).toBeNull();
    expect(purchasedProductsCta([{ productId: "  " }])).toBeNull();
  });

  it("links a single line to the product detail route", () => {
    expect(
      purchasedProductsCta([{ productId: "p1" }, { productId: "p1" }]),
    ).toEqual({
      label: "View purchased product",
      to: { name: "product", params: { id: "p1" } },
    });
  });

  it("links several distinct lines to the catalog with ids query", () => {
    expect(
      purchasedProductsCta([
        { productId: "p1" },
        { productId: "p2" },
        { productId: "p1" },
      ]),
    ).toEqual({
      label: "View purchased products",
      to: { name: "productList", query: { ids: "p1,p2" } },
    });
  });
});
