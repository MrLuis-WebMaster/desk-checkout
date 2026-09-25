import { describe, expect, it } from "vitest";
import {
  toListProductsQuery,
  toProductIdParam,
} from "./catalog-route.mapper";

describe("catalog-route.mapper", () => {
  it("maps list query params", () => {
    expect(
      toListProductsQuery({
        pageSize: "24",
        q: " lamp ",
        sort: "price",
        order: "desc",
        page: "2",
      }),
    ).toMatchObject({
      pageSize: 24,
      q: "lamp",
      sort: "price",
      order: "desc",
      page: 2,
    });
  });

  it("validates product id route params", () => {
    expect(toProductIdParam("p1")).toBe("p1");
    expect(toProductIdParam("")).toBeNull();
    expect(toProductIdParam(["p1"])).toBeNull();
  });
});
