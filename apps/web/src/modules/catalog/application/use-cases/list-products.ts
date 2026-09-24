import type { ListProductsQuery, ProductPageDto } from "@checkout/contracts";
import type { CatalogPort } from "../ports/catalog.port";
import type { ScreenResult } from "../results/screen-result";

export async function listProducts(
  port: CatalogPort,
  query: ListProductsQuery,
  signal?: AbortSignal,
): Promise<ScreenResult<ProductPageDto>> {
  return port.listProducts(query, signal);
}
