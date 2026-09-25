import { describe, expect, it } from "vitest";
import {
  parseProductListIds,
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

  it("maps ids and drops cursor/search params", () => {
    expect(
      toListProductsQuery({
        ids: "a,b, a,,c",
        q: "ignored",
        after: "cursor",
        before: "prev",
        page: "3",
        pageSize: "12",
        sort: "name",
        order: "asc",
      }),
    ).toEqual({
      pageSize: 12,
      sort: "name",
      order: "asc",
      ids: ["a", "b", "c"],
    });
  });

  it("parses comma-separated ids with a short cap", () => {
    expect(parseProductListIds("p1,p2")).toEqual(["p1", "p2"]);
    expect(parseProductListIds("")).toBeUndefined();
    expect(parseProductListIds(undefined)).toBeUndefined();
    const many = Array.from({ length: 25 }, (_, i) => `id-${i}`).join(",");
    expect(parseProductListIds(many)).toHaveLength(20);
  });

  it("validates product id route params", () => {
    expect(toProductIdParam("p1")).toBe("p1");
    expect(toProductIdParam("")).toBeNull();
    expect(toProductIdParam(["p1"])).toBeNull();
  });
});
