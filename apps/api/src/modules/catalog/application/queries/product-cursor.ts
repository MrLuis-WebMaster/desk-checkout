import {
  isProductOrder,
  isProductSort,
  type ProductOrder,
  type ProductSort,
} from "@checkout/contracts";

export type { ProductOrder, ProductSort };

export type ProductCursorPayload = {
  sort: ProductSort;
  order: ProductOrder;
  name: string;
  price: number;
  id: string;
};

export function encodeProductCursor(payload: ProductCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeProductCursor(
  raw: string,
): ProductCursorPayload | null {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    );
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const value = parsed as Record<string, unknown>;
    if (!isProductSort(value.sort) || !isProductOrder(value.order)) {
      return null;
    }
    if (typeof value.name !== "string" || typeof value.id !== "string") {
      return null;
    }
    if (typeof value.price !== "number" || !Number.isFinite(value.price)) {
      return null;
    }
    return {
      sort: value.sort,
      order: value.order,
      name: value.name,
      price: value.price,
      id: value.id,
    };
  } catch {
    return null;
  }
}
