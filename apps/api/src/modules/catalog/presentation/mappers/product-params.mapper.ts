import type { ProductParamsDto } from "../dto/product-params.dto.js";

export function toProductId(dto: ProductParamsDto): string {
  return dto.id;
}
