import type { LocationQuery } from "vue-router";
import {
  blankToUndefined,
  type ListProductsQuery,
  parseProductListPage,
  parseProductListPageSize,
  parseProductOrder,
  parseProductSort,
} from "@checkout/contracts";

function queryString(value: LocationQuery[string]): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function toListProductsQuery(query: LocationQuery): ListProductsQuery {
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
