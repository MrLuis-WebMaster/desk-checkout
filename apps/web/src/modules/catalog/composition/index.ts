import type {
  ListProductsQuery,
  ProductDto,
  ProductPageDto,
} from "@checkout/contracts";
import type { ScreenResult } from "../application/results/screen-result";
import { HttpCatalogAdapter } from "../infrastructure/http-catalog.adapter";

const catalogPort = new HttpCatalogAdapter();

export function listProducts(
  query: ListProductsQuery,
  signal?: AbortSignal,
): Promise<ScreenResult<ProductPageDto>> {
  return catalogPort.listProducts(query, signal);
}

export function getProduct(
  id: string,
  signal?: AbortSignal,
): Promise<ScreenResult<ProductDto>> {
  return catalogPort.getProduct(id, signal);
}
