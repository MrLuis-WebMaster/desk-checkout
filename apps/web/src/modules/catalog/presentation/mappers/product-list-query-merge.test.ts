import { describe, expect, it } from "vitest";
import {
  mergeProductListQuery,
  searchClearsIds,
} from "./product-list-query-merge";

const base = {
  pageSize: 12,
  sort: "name" as const,
  order: "asc" as const,
};

describe("mergeProductListQuery", () => {
  it("preserves ids when changing sort", () => {
    expect(
      mergeProductListQuery(
        { ...base, ids: ["a", "b"] },
        { sort: "price", after: undefined, before: undefined, page: undefined },
      ),
    ).toEqual({
      pageSize: "12",
      sort: "price",
      order: "asc",
      ids: "a,b",
    });
  });

  it("strips search and cursors while ids are set", () => {
    expect(
      mergeProductListQuery(
        { ...base, ids: ["a"], q: "usb", page: 2 },
        { order: "desc" },
      ),
    ).toEqual({
      pageSize: "12",
      sort: "name",
      order: "desc",
      ids: "a",
    });
  });

  it("clears ids when patch.ids is null", () => {
    expect(
      mergeProductListQuery({ ...base, ids: ["a"] }, { ids: null, q: "desk" }),
    ).toEqual({
      pageSize: "12",
      sort: "name",
      order: "asc",
      q: "desk",
    });
  });
});

describe("searchClearsIds", () => {
  it("nulls ids and resets cursors", () => {
    expect(searchClearsIds("usb")).toEqual({
      q: "usb",
      ids: null,
      after: undefined,
      before: undefined,
      page: undefined,
    });
  });
});
