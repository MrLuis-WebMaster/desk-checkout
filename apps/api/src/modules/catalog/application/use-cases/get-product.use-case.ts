import { Injectable } from "@nestjs/common";
import type { ProductDto } from "@checkout/contracts";
import { err, ok, type Result } from "#shared/result/result.js";
import { ProductNotFoundError } from "../../domain/product/errors.js";
import { ProductReader } from "../ports/product-reader.port.js";

@Injectable()
export class GetProductUseCase {
  constructor(private readonly productReader: ProductReader) {}

  async execute(
    id: string,
  ): Promise<Result<ProductDto, ProductNotFoundError>> {
    const product = await this.productReader.findById(id);
    if (!product) {
      return err(new ProductNotFoundError(id));
    }
    return ok(product);
  }
}
