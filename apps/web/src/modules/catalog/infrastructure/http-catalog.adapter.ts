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
        q: query.ids ? undefined : query.q,
        after: query.ids ? undefined : query.after,
        before: query.ids ? undefined : query.before,
        page:
          query.ids || !(query.page && query.page > 1)
            ? undefined
            : String(query.page),
        ids: query.ids?.length ? query.ids.join(",") : undefined,
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
