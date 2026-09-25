import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { InventoryOrmEntity } from "#modules/inventory/infrastructure/typeorm/inventory.orm-entity.js";
import { InventoryWriter } from "../../application/ports/inventory-writer.port.js";

@Injectable()
export class TypeOrmInventoryWriter extends InventoryWriter {
  constructor(
    @InjectRepository(InventoryOrmEntity)
    private readonly inventory: Repository<InventoryOrmEntity>,
  ) {
    super();
  }

  async decrementIfAvailable(
    productId: string,
    quantity: number,
  ): Promise<boolean> {
    const result = await this.inventory
      .createQueryBuilder()
      .update(InventoryOrmEntity)
      .set({ available: () => `"available" - ${quantity}` })
      .where("product_id = :productId AND available >= :quantity", {
        productId,
        quantity,
      })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async decrementLocked(
    manager: EntityManager,
    productId: string,
    quantity: number,
  ): Promise<boolean> {
    const inventory = await manager
      .createQueryBuilder(InventoryOrmEntity, "inventory")
      .setLock("pessimistic_write")
      .where("inventory.productId = :productId", { productId })
      .getOne();
    if (!inventory || inventory.available < quantity) {
      return false;
    }
    inventory.available -= quantity;
    await manager.save(inventory);
    return true;
  }

  /** Locks every line first; decrements only when all lines have stock. */
  async decrementManyLocked(
    manager: EntityManager,
    lines: Array<{ productId: string; quantity: number }>,
  ): Promise<boolean> {
    const locked: Array<{ inventory: InventoryOrmEntity; quantity: number }> =
      [];
    for (const line of lines) {
      const inventory = await manager
        .createQueryBuilder(InventoryOrmEntity, "inventory")
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
}
