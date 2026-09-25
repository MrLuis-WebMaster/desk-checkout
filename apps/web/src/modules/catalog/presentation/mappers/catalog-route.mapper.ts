import type { LocationQuery } from "vue-router";
import {
  blankToUndefined,
  PRODUCT_LIST_IDS_MAX,
  type ListProductsQuery,
  parseProductListPage,
  parseProductListPageSize,
  parseProductOrder,
  parseProductSort,
} from "@checkout/contracts";

function queryString(value: LocationQuery[string]): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Comma-separated UUIDs/ids; collapses duplicates; caps at PRODUCT_LIST_IDS_MAX. */
export function parseProductListIds(
  value: LocationQuery[string],
): string[] | undefined {
  const raw = queryString(value);
  if (!raw) {
    return undefined;
  }
  const ids = [
    ...new Set(
      raw
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part.length > 0),
    ),
  ].slice(0, PRODUCT_LIST_IDS_MAX);
  return ids.length > 0 ? ids : undefined;
}

export function toListProductsQuery(query: LocationQuery): ListProductsQuery {
  const ids = parseProductListIds(query.ids);
  if (ids) {
    return {
      pageSize: parseProductListPageSize(query.pageSize),
      sort: parseProductSort(query.sort),
      order: parseProductOrder(query.order),
      ids,
    };
  }
  return {
    pageSize: parseProductListPageSize(query.pageSize),
    q: blankToUndefined(queryString(query.q)),
    sort: parseProductSort(query.sort),
    order: parseProductOrder(query.order),
    after: queryString(query.after),
    before: queryString(query.before),
    page: parseProductListPage(query.page),
  };
}

export function toProductIdParam(
  value: string | string[] | undefined,
): string | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  return value;
}
