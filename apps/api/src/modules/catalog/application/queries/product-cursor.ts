import {
  blankToUndefined,
  isProductOrder,
  isProductSort,
  type ProductOrder,
  type ProductSort,
} from "@checkout/contracts";

export type { ProductOrder, ProductSort };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ProductCursorPayload = {
  sort: ProductSort;
  order: ProductOrder;
  /** Normalized search filter bound to this cursor (`""` when none). */
  q: string;
  name: string;
  price: number;
  id: string;
};

export function normalizeCursorQ(q: string | undefined): string {
  return blankToUndefined(q) ?? "";
}

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
    if (!UUID_RE.test(value.id)) {
      return null;
    }
    if (
      typeof value.price !== "number" ||
      !Number.isInteger(value.price) ||
      value.price < 0
    ) {
      return null;
    }
    const q =
      value.q === undefined
        ? ""
        : typeof value.q === "string"
          ? normalizeCursorQ(value.q)
          : null;
    if (q === null) {
      return null;
    }
    return {
      sort: value.sort,
      order: value.order,
      q,
      name: value.name,
      price: value.price,
      id: value.id,
    };
  } catch {
    return null;
  }
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
