import type {
  ListProductsQuery,
  ProductDto,
  ProductPageDto,
} from "@checkout/contracts";
import { getProduct as runGetProduct } from "../application/use-cases/get-product";
import { listProducts as runListProducts } from "../application/use-cases/list-products";
import type { ScreenResult } from "../application/results/screen-result";
import { HttpCatalogAdapter } from "../infrastructure/http-catalog.adapter";

const catalogPort = new HttpCatalogAdapter();

export function listProducts(
  query: ListProductsQuery,
  signal?: AbortSignal,
): Promise<ScreenResult<ProductPageDto>> {
  return runListProducts(catalogPort, query, signal);
}

export function getProduct(
  id: string,
  signal?: AbortSignal,
): Promise<ScreenResult<ProductDto>> {
  return runGetProduct(catalogPort, id, signal);
}
