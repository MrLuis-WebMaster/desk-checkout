import type {
  ListProductsQuery,
  ProductDto,
  ProductPageDto,
} from "@checkout/contracts";

export type { ListProductsQuery };

export abstract class ProductReader {
  abstract list(query: ListProductsQuery): Promise<ProductPageDto>;
  abstract findById(id: string): Promise<ProductDto | null>;
}
