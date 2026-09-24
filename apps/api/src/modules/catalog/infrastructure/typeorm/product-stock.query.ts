import type { ObjectLiteral, SelectQueryBuilder } from "typeorm";

export const AVAILABLE_STOCK_COLUMN =
  'COALESCE(inventory.available, 0) AS "availableStock"';

export function joinAvailableStock<Entity extends ObjectLiteral>(
  qb: SelectQueryBuilder<Entity>,
): SelectQueryBuilder<Entity> {
  return qb.leftJoin(
    "inventory",
    "inventory",
    "inventory.product_id = product.id",
  );
}
