import type {
  ListProductsQuery,
  ProductDto,
  ProductPageDto,
} from "@checkout/contracts";
import { apiClient } from "@/shared/infrastructure/http/api-client";
import { CatalogPort } from "../application/ports/catalog.port";
import type { ScreenResult } from "../application/results/screen-result";
import { toScreenResult } from "../application/mappers/to-screen-result";

export class HttpCatalogAdapter extends CatalogPort {
  async listProducts(
    query: ListProductsQuery,
    signal?: AbortSignal,
  ): Promise<ScreenResult<ProductPageDto>> {
    const result = await apiClient.get<ProductPageDto>("/products", {
      query: {
        pageSize: String(query.pageSize),
        sort: query.sort,
        order: query.order,
        q: query.q,
        after: query.after,
        before: query.before,
        page: query.page && query.page > 1 ? String(query.page) : undefined,
      },
      signal,
    });
    return toScreenResult(result);
  }

  async getProduct(
    id: string,
    signal?: AbortSignal,
  ): Promise<ScreenResult<ProductDto>> {
    const result = await apiClient.get<ProductDto>(`/products/${id}`, {
      signal,
    });
    return toScreenResult(result);
  }
}
