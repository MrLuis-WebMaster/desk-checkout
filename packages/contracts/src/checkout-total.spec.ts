import {
  blankToUndefined,
  computeCheckoutTotal,
  computeLineSubtotal,
  computeMerchandiseTotal,
  computeOrderTotal,
  isProductOrder,
  isProductSort,
  normalizeCheckoutQuantity,
  parseProductListPage,
  parseProductListPageSize,
  parseProductOrder,
  parseProductSort,
  PRODUCT_LIST_OFFSET_PAGE_MAX,
  PRODUCT_LIST_PAGE_SIZE,
} from "./index";

describe("normalizeCheckoutQuantity", () => {
  it("floors fractional quantities and clamps zero/negative to 1", () => {
    expect(normalizeCheckoutQuantity(2.9)).toBe(2);
    expect(normalizeCheckoutQuantity(0)).toBe(1);
    expect(normalizeCheckoutQuantity(-3)).toBe(1);
    expect(normalizeCheckoutQuantity(1)).toBe(1);
  });
});

describe("checkout totals", () => {
  it("computes a single-line checkout total", () => {
    expect(
      computeCheckoutTotal({
        unitPrice: 10_000,
        quantity: 2,
        baseFee: 500,
        deliveryFee: 1_500,
      }),
    ).toBe(22_000);
  });

  it("normalizes zero quantity when computing a line subtotal", () => {
    expect(computeLineSubtotal(5_000, 0)).toBe(5_000);
    expect(computeLineSubtotal(5_000, -2)).toBe(5_000);
  });

  it("sums multi-line merchandise and order totals", () => {
    const lines = [
      { unitPrice: 10_000, quantity: 1 },
      { unitPrice: 2_500, quantity: 0 },
      { unitPrice: 3_000, quantity: 2.7 },
    ];
    expect(computeMerchandiseTotal(lines)).toBe(10_000 + 2_500 + 6_000);
    expect(
      computeOrderTotal({ lines, baseFee: 500, deliveryFee: 1_500 }),
    ).toBe(10_000 + 2_500 + 6_000 + 500 + 1_500);
  });
});

describe("product list query helpers", () => {
  it("parses sorts, orders, pages, and page sizes with fallbacks", () => {
    expect(isProductSort("name")).toBe(true);
    expect(isProductSort("sku")).toBe(false);
    expect(parseProductSort("price")).toBe("price");
    expect(parseProductSort("nope")).toBe("name");

    expect(isProductOrder("desc")).toBe(true);
    expect(isProductOrder("sideways")).toBe(false);
    expect(parseProductOrder("desc")).toBe("desc");
    expect(parseProductOrder(null)).toBe("asc");

    expect(parseProductListPage(3)).toBe(3);
    expect(parseProductListPage("2")).toBe(2);
    expect(parseProductListPage(0)).toBe(1);
    expect(parseProductListPage(PRODUCT_LIST_OFFSET_PAGE_MAX + 1)).toBe(1);

    expect(parseProductListPageSize(24)).toBe(24);
    expect(parseProductListPageSize("99")).toBe(PRODUCT_LIST_PAGE_SIZE.default);
    expect(parseProductListPageSize(-1, 8)).toBe(8);
  });

  it("blanks empty strings to undefined", () => {
    expect(blankToUndefined("  hello ")).toBe("hello");
    expect(blankToUndefined("   ")).toBeUndefined();
    expect(blankToUndefined(null)).toBeUndefined();
    expect(blankToUndefined(undefined)).toBeUndefined();
  });
});
