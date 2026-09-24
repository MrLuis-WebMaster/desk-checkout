import type {
  ListProductsQuery,
  ProductDto,
  ProductPageDto,
} from "@checkout/contracts";
import type { ScreenResult } from "../results/screen-result";

export abstract class CatalogPort {
  abstract listProducts(
    query: ListProductsQuery,
    signal?: AbortSignal,
  ): Promise<ScreenResult<ProductPageDto>>;
  abstract getProduct(
    id: string,
    signal?: AbortSignal,
  ): Promise<ScreenResult<ProductDto>>;
}
