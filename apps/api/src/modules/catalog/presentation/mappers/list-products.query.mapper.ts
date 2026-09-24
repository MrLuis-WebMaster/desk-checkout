import { blankToUndefined, type ListProductsQuery } from "@checkout/contracts";
import type { ListProductsQueryDto } from "../dto/list-products.query.dto.js";

export function toListProductsQuery(
  dto: ListProductsQueryDto,
): ListProductsQuery {
  return {
    pageSize: dto.pageSize,
    q: blankToUndefined(dto.q),
    sort: dto.sort,
    order: dto.order,
    after: dto.after,
    before: dto.before,
    page: dto.page,
  };
}
