import type { ProductSummaryDto } from "@checkout/contracts";
import {
  encodeProductCursor,
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

  // Forward peek (`hasExtra`) or any successful `before` page (there is always
  // a forward neighbor past that page toward the original cursor).
  const hasNext = input.goingBackward || input.hasExtra;
  // Backward peek, or we already moved forward via `after` / offset page > 1.
  const hasPrev =
    (input.goingBackward && input.hasExtra) ||
    input.usedAfter ||
    input.offsetPageNumber > 1;

  return {
    nextCursor: hasNext ? cursorFromItem(last, input.sort, input.order) : null,
    prevCursor: hasPrev ? cursorFromItem(first, input.sort, input.order) : null,
  };
}

function cursorFromItem(
  item: ProductSummaryDto,
  sort: ProductSort,
  order: ProductOrder,
): string {
  return encodeProductCursor({
    sort,
    order,
    name: item.name,
    price: item.price,
    id: item.id,
  });
}
