export abstract class InventoryWriter {
  abstract decrementIfAvailable(
    productId: string,
    quantity: number,
  ): Promise<boolean>;
}
