import type { ProductSummaryDto } from "@checkout/contracts";
import {
  encodeProductCursor,
  normalizeCursorQ,
  type ProductOrder,
  type ProductSort,
} from "./product-cursor.js";

export type ProductPageCursorLinks = {
  nextCursor: string | null;
  prevCursor: string | null;
};

/**
 * Builds next/prev cursors from the first/last records of the page the client
 * receives (already ordered in the requested sort/order).
 */
export function buildProductPageCursors(input: {
  items: readonly ProductSummaryDto[];
  sort: ProductSort;
  order: ProductOrder;
  q: string | undefined;
  goingBackward: boolean;
  hasExtra: boolean;
  usedAfter: boolean;
  offsetPageNumber: number;
}): ProductPageCursorLinks {
  const first = input.items[0];
  const last = input.items[input.items.length - 1];
  if (!first || !last) {
    return { nextCursor: null, prevCursor: null };
  }

  const hasNext = input.goingBackward || input.hasExtra;
  const hasPrev =
    (input.goingBackward && input.hasExtra) ||
    input.usedAfter ||
    input.offsetPageNumber > 1;

  const q = normalizeCursorQ(input.q);

  return {
    nextCursor: hasNext
      ? cursorFromItem(last, input.sort, input.order, q)
      : null,
    prevCursor: hasPrev
      ? cursorFromItem(first, input.sort, input.order, q)
      : null,
  };
}

function cursorFromItem(
  item: ProductSummaryDto,
  sort: ProductSort,
  order: ProductOrder,
  q: string,
): string {
  return encodeProductCursor({
    sort,
    order,
    q,
    name: item.name,
    price: item.price,
    id: item.id,
  });
}
