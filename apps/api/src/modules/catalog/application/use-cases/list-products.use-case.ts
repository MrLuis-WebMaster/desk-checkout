import { Injectable } from "@nestjs/common";
import type { ProductPageDto } from "@checkout/contracts";
import { err, ok, type Result } from "#shared/result/result.js";
import { decodeProductCursor } from "../queries/product-cursor.js";
import {
  ProductReader,
  type ListProductsQuery,
} from "../ports/product-reader.port.js";

export class InvalidProductCursorError {
  readonly code = "VALIDATION_ERROR" as const;
}

@Injectable()
export class ListProductsUseCase {
  constructor(private readonly productReader: ProductReader) {}

  async execute(
    query: ListProductsQuery,
  ): Promise<Result<ProductPageDto, InvalidProductCursorError>> {
    if (query.after && query.before) {
      return err(new InvalidProductCursorError());
    }
    if (query.page !== undefined && (query.after || query.before)) {
      return err(new InvalidProductCursorError());
    }
    if (query.after) {
      const cursor = decodeProductCursor(query.after);
      if (!cursor || cursor.sort !== query.sort || cursor.order !== query.order) {
        return err(new InvalidProductCursorError());
      }
    }
    if (query.before) {
      const cursor = decodeProductCursor(query.before);
      if (!cursor || cursor.sort !== query.sort || cursor.order !== query.order) {
        return err(new InvalidProductCursorError());
      }
    }

    const page = await this.productReader.list(query);
    return ok(page);
  }
}
