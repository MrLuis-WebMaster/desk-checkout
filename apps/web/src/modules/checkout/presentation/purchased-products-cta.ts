import { routeNames } from "@/app/router";

export type PurchasedProductsCta =
  | {
      label: string;
      to: { name: typeof routeNames.product; params: { id: string } };
    }
  | {
      label: string;
      to: {
        name: typeof routeNames.productList;
        query: { ids: string };
      };
    };

/**
 * CTA target for purchased lines: one product → detail; several → list ?ids=.
 */
export function purchasedProductsCta(
  lines: ReadonlyArray<{ productId: string }>,
): PurchasedProductsCta | null {
  const ids = [
    ...new Set(
      lines
        .map((line) => line.productId.trim())
        .filter((id) => id.length > 0),
    ),
  ];
  if (ids.length === 0) {
    return null;
  }
  if (ids.length === 1) {
    return {
      label: "View purchased product",
      to: {
        name: routeNames.product,
        params: { id: ids[0]! },
      },
    };
  }
  return {
    label: "View purchased products",
    to: {
      name: routeNames.productList,
      query: { ids: ids.join(",") },
    },
  };
}
