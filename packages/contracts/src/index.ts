export enum TransactionStatus {
  Pending = "PENDING",
  Approved = "APPROVED",
  Declined = "DECLINED",
  Error = "ERROR",
  Expired = "EXPIRED",
}

export { DeliveryStatus } from "./delivery-status.js";

export {
  ORDER_CONFIRMED_TYPE,
  ORDER_CONFIRMED_VERSION,
  parseOrderConfirmedEvent,
  type OrderConfirmedEvent,
  type ParseOrderConfirmedResult,
} from "./events/order-confirmed.js";

export {
  PAYMENT_STATUS_CHANGED_TYPE,
  PAYMENT_STATUS_CHANGED_VERSION,
  parsePaymentStatusChangedEvent,
  type PaymentStatusChangedEvent,
  type ParsePaymentStatusChangedResult,
} from "./events/payment-status-changed.js";

export const ApiErrorCode = {
  ValidationError: "VALIDATION_ERROR",
  ProductNotFound: "PRODUCT_NOT_FOUND",
  OutOfStock: "OUT_OF_STOCK",
  ShippingRateNotFound: "SHIPPING_RATE_NOT_FOUND",
  ShippingMethodNotFound: "SHIPPING_METHOD_NOT_FOUND",
  CheckoutSettingsNotFound: "CHECKOUT_SETTINGS_NOT_FOUND",
  TransactionNotFound: "TRANSACTION_NOT_FOUND",
  CustomerNotFound: "CUSTOMER_NOT_FOUND",
  DeliveryNotFound: "DELIVERY_NOT_FOUND",
  PaymentFailed: "PAYMENT_FAILED",
  InvalidTransactionState: "INVALID_TRANSACTION_STATE",
  IdempotencyConflict: "IDEMPOTENCY_CONFLICT",
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
  default: 12,
} as const;

/** Max 1-based offset page accepted by the API (beyond this, use cursors). */
export const PRODUCT_LIST_OFFSET_PAGE_MAX = 100;

/** Max product ids accepted by GET /products?ids= (no cursor). */
export const PRODUCT_LIST_IDS_MAX = 20;

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
  /** 1-based page (offset). Mutually exclusive with after/before. */
  page?: number;
  /**
   * Exact product ids (no cursor). Mutually exclusive with after, before,
   * page, and q. Unknown ids are omitted; duplicates are collapsed.
   */
  ids?: string[];
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
  if (
    Number.isInteger(n) &&
    n >= 1 &&
    n <= PRODUCT_LIST_OFFSET_PAGE_MAX
  ) {
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

export const SHIPPING_CITY_CODES = ["BOG", "MED", "CALI", "OTHER"] as const;

export type ShippingCityCode = (typeof SHIPPING_CITY_CODES)[number];

/** @deprecated Use SHIPPING_CITY_CODES */
export const SHIPPING_REGION_CODES = SHIPPING_CITY_CODES;

/** @deprecated Use ShippingCityCode */
export type ShippingRegionCode = ShippingCityCode;

/** Quote amount in the same integer COP units as `ProductDto.price`. */
export type ShippingMethodQuoteDto = {
  id: string;
  code: string;
  name: string;
  amount: number;
};

/** Base fee in the same integer COP units as `ProductDto.price`. */
export type CheckoutSettingsDto = {
  baseFee: number;
};

export type TransactionCustomerDto = {
  fullName: string;
  email: string;
  phone: string;
};

export type TransactionDeliveryDto = {
  shippingMethodId: string;
  addressLine: string;
  city: ShippingCityCode;
  /** Present on reads; omit on create (DB default PENDING). */
  status?: import("./delivery-status.js").DeliveryStatus;
};

export type CreateCustomerRequest = TransactionCustomerDto;

export type CustomerDto = TransactionCustomerDto & {
  id: string;
};

export type CreateDeliveryRequest = TransactionDeliveryDto;

export type DeliveryDto = TransactionDeliveryDto & {
  id: string;
  status: import("./delivery-status.js").DeliveryStatus;
};

export type CreateTransactionItemDto = {
  productId: string;
  quantity: number;
};

export type CreateTransactionRequest = {
  items: CreateTransactionItemDto[];
  customer: TransactionCustomerDto;
  delivery: TransactionDeliveryDto;
};

export type PaymentConfigDto = {
  publicKey: string;
  acceptanceToken: string;
  acceptanceTokenType: string;
  acceptPersonalAuth: string;
  acceptPersonalAuthType: string;
};

export type PayTransactionRequest = {
  paymentMethodToken: string;
  acceptanceToken: string;
  acceptPersonalAuth: string;
  installments?: number;
};

export type WidgetCheckoutSessionDto = {
  publicKey: string;
  amountInCents: number;
  currency: "COP";
  reference: string;
  signature: string;
};

export type SyncProviderPaymentRequest = {
  providerTransactionId: string;
};

export type TransactionLineDto = {
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
};

export type TransactionDto = {
  id: string;
  status: TransactionStatus;
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  lines: TransactionLineDto[];
  baseFee: number;
  deliveryFee: number;
  total: number;
  customer: TransactionCustomerDto;
  delivery: TransactionDeliveryDto;
  createdAt: string;
};

export type HealthDto = {
  status: "ok";
  transactionStatuses: typeof TransactionStatus;
};

export {
  computeCheckoutTotal,
  computeLineSubtotal,
  computeMerchandiseTotal,
  computeOrderTotal,
  normalizeCheckoutQuantity,
  type CheckoutLineInput,
  type CheckoutTotalInput,
} from "./checkout-total.js";
