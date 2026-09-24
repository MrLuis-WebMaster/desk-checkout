import type { ProductDto } from "@checkout/contracts";
import type { CatalogPort } from "../ports/catalog.port";
import type { ScreenResult } from "../results/screen-result";

export async function getProduct(
  port: CatalogPort,
  id: string,
  signal?: AbortSignal,
): Promise<ScreenResult<ProductDto>> {
  return port.getProduct(id, signal);
}
