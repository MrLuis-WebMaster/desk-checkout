import type { EntityManager } from "typeorm";

export abstract class InventoryWriter {
  abstract decrementIfAvailable(
    productId: string,
    quantity: number,
  ): Promise<boolean>;

  /**
   * Lock and decrement every line inside an open DB transaction, or none.
   * `manager` is the TypeORM EntityManager for the caller's unit of work.
   */
  abstract decrementManyLocked(
    manager: EntityManager,
    lines: Array<{ productId: string; quantity: number }>,
  ): Promise<boolean>;
}
