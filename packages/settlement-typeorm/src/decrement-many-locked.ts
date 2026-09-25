import { EntityManager, type EntityTarget, type ObjectLiteral } from "typeorm";
import { InventoryOrmEntity } from "./inventory.orm-entity.js";

export type InventoryStockEntity = ObjectLiteral & {
  productId: string;
  available: number;
};

/** Locks every line first (stable productId order); decrements only when all have stock. */
export async function decrementManyLocked(
  manager: EntityManager,
  lines: Array<{ productId: string; quantity: number }>,
  /**
   * Entity registered on the caller's DataSource. Defaults to this package's
   * inventory entity (worker). API must pass its own `InventoryOrmEntity`.
   */
  inventoryEntity: EntityTarget<InventoryStockEntity> = InventoryOrmEntity,
): Promise<boolean> {
  const ordered = [...lines].sort((a, b) =>
    a.productId.localeCompare(b.productId),
  );
  const locked: Array<{ inventory: InventoryStockEntity; quantity: number }> =
    [];
  for (const line of ordered) {
    const inventory = await manager
      .createQueryBuilder(inventoryEntity, "inventory")
      .setLock("pessimistic_write")
      .where("inventory.productId = :productId", {
        productId: line.productId,
      })
      .getOne();
    if (!inventory || inventory.available < line.quantity) {
      return false;
    }
    locked.push({ inventory, quantity: line.quantity });
  }
  for (const entry of locked) {
    entry.inventory.available -= entry.quantity;
    await manager.save(entry.inventory);
  }
  return true;
}
