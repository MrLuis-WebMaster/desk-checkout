import {
  blankToUndefined,
  type ProductOrder,
  type ProductSort,
} from "@checkout/contracts";

export type ProductListQueryState = {
  pageSize: number;
  q?: string;
  sort: ProductSort;
  order: ProductOrder;
  after?: string;
  before?: string;
  page?: number;
  ids?: string[];
};

export type ProductListQueryPatch = {
  pageSize?: string;
  q?: string;
  sort?: ProductSort;
  order?: ProductOrder;
  after?: string;
  before?: string;
  page?: string;
  /** Comma-separated ids. `null` clears the purchased-product scope. */
  ids?: string | null;
};

/** Build the next catalog URL query, preserving `ids` unless cleared. */
export function mergeProductListQuery(
  current: ProductListQueryState,
  patch: ProductListQueryPatch,
): Record<string, string> {
  const idsFromCurrent =
    current.ids && current.ids.length > 0 ? current.ids.join(",") : undefined;
  const ids =
    patch.ids === null
      ? undefined
      : patch.ids !== undefined
        ? patch.ids
        : idsFromCurrent;

  const merged: ProductListQueryPatch = {
    pageSize: String(current.pageSize),
    sort: current.sort,
    order: current.order,
    ...(ids
      ? { ids }
      : {
          q: current.q,
          after: current.after,
          before: current.before,
          page: (current.page ?? 0) > 1 ? String(current.page) : undefined,
        }),
    ...patch,
  };

  if (merged.ids === null) {
    merged.ids = undefined;
  }

  if (merged.ids) {
    merged.q = undefined;
    merged.after = undefined;
    merged.before = undefined;
    merged.page = undefined;
  }

  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined && value !== null && value !== "") {
      next[key] = value;
    }
  }
  return next;
}

export function searchClearsIds(q: string): ProductListQueryPatch {
  return {
    q: blankToUndefined(q),
    ids: null,
    after: undefined,
    before: undefined,
    page: undefined,
  };
}
