export enum TransactionStatus {
  Pending = "PENDING",
  Approved = "APPROVED",
  Declined = "DECLINED",
  Error = "ERROR",
}

export const ApiErrorCode = {
  ValidationError: "VALIDATION_ERROR",
  ProductNotFound: "PRODUCT_NOT_FOUND",
  RouteNotFound: "ROUTE_NOT_FOUND",
  Unexpected: "UNEXPECTED",
} as const;

export type ApiErrorCode =
  (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export const PRODUCT_SORTS = ["name", "price"] as const;
export const PRODUCT_ORDERS = ["asc", "desc"] as const;
export const PRODUCT_LIST_PAGE_SIZE = {
  min: 1,
  max: 50,
  default: 10,
} as const;

export type ProductSort = (typeof PRODUCT_SORTS)[number];
export type ProductOrder = (typeof PRODUCT_ORDERS)[number];

/** Shared list query between API application and web catalog port. */
export type ListProductsQuery = {
  pageSize: number;
  q?: string;
  sort: ProductSort;
  order: ProductOrder;
  after?: string;
  before?: string;
  /** 1-based page. Used when cursors are absent. */
  page?: number;
};

export function isProductSort(value: unknown): value is ProductSort {
  return (
    typeof value === "string" &&
    (PRODUCT_SORTS as readonly string[]).includes(value)
  );
}

export function isProductOrder(value: unknown): value is ProductOrder {
  return (
    typeof value === "string" &&
    (PRODUCT_ORDERS as readonly string[]).includes(value)
  );
}

export function parseProductSort(
  value: unknown,
  fallback: ProductSort = "name",
): ProductSort {
  return isProductSort(value) ? value : fallback;
}

export function parseProductOrder(
  value: unknown,
  fallback: ProductOrder = "asc",
): ProductOrder {
  return isProductOrder(value) ? value : fallback;
}

export function parseProductListPage(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isInteger(n) && n >= 1 && n <= 10_000) {
    return n;
  }
  return 1;
}

export function parseProductListPageSize(
  value: unknown,
  fallback: number = PRODUCT_LIST_PAGE_SIZE.default,
): number {
  const n = typeof value === "number" ? value : Number(value);
  if (
    Number.isInteger(n) &&
    n >= PRODUCT_LIST_PAGE_SIZE.min &&
    n <= PRODUCT_LIST_PAGE_SIZE.max
  ) {
    return n;
  }
  return fallback;
}

/** Trim and drop empty strings (shared query normalization). */
export function blankToUndefined(
  value: string | undefined | null,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** List row: no description (detail endpoint carries the full text). */
export type ProductSummaryDto = {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  availableStock: number;
};

export type ProductDto = ProductSummaryDto & {
  description: string;
};

export type ProductPageDto = {
  items: ProductSummaryDto[];
  pageSize: number;
  total: number;
  nextCursor: string | null;
  prevCursor: string | null;
};

export type HealthDto = {
  status: "ok";
  transactionStatuses: typeof TransactionStatus;
};
