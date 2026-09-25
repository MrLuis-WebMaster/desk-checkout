import { ApiErrorCode } from "@checkout/contracts";
import { CREATE_OUT_OF_STOCK_MESSAGE } from "@/shared/application/messages/stock-messages";

export type ScreenOk<T> = { status: "ok"; value: T };
export type ScreenError =
  | { status: "not_found" }
  | { status: "invalid_query" }
  | { status: "out_of_stock" }
  | { status: "load_failed" }
  | { status: "aborted" };

export type ScreenResult<T> = ScreenOk<T> | ScreenError;

export function mapApiErrorCode(code: string): ScreenError {
  if (
    code === ApiErrorCode.ProductNotFound ||
    code === ApiErrorCode.TransactionNotFound
  ) {
    return { status: "not_found" };
  }
  if (code === ApiErrorCode.ValidationError) {
    return { status: "invalid_query" };
  }
  if (code === ApiErrorCode.OutOfStock) {
    return { status: "out_of_stock" };
  }
  return { status: "load_failed" };
}

export function screenMessage(error: ScreenError): string {
  switch (error.status) {
    case "not_found":
      return "We couldn't find that product.";
    case "invalid_query":
      return "Check your search or filters and try again.";
    case "out_of_stock":
      return CREATE_OUT_OF_STOCK_MESSAGE;
    case "load_failed":
      return "Couldn't reach the catalog. Check your connection and try again.";
    case "aborted":
      return "";
  }
}
