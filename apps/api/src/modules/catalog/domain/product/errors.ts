export class ProductNotFoundError {
  readonly code = "PRODUCT_NOT_FOUND" as const;

  constructor(readonly productId: string) {}
}
