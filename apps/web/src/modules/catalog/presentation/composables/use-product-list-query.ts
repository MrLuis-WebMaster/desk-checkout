import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  blankToUndefined,
  type ListProductsQuery,
  type ProductOrder,
  type ProductSort,
} from "@checkout/contracts";
import { routeNames } from "@/app/router";
import { toListProductsQuery } from "@/modules/catalog/presentation/mappers/catalog-route.mapper";

type QueryPatch = {
  pageSize?: string;
  q?: string;
  sort?: ProductSort;
  order?: ProductOrder;
  after?: string;
  before?: string;
  page?: string;
};

export function useProductListQuery() {
  const route = useRoute(routeNames.productList);
  const router = useRouter();

  const query = computed(() => toListProductsQuery(route.query));

  function replaceQuery(patch: QueryPatch) {
    const current = query.value;
    const next: Record<string, string> = {};
    const merged: QueryPatch = {
      pageSize: String(current.pageSize),
      q: current.q,
      sort: current.sort,
      order: current.order,
      after: current.after,
      before: current.before,
      page: current.page > 1 ? String(current.page) : undefined,
      ...patch,
    };

    for (const [key, value] of Object.entries(merged)) {
      if (value !== undefined && value !== "") {
        next[key] = value;
      }
    }

    void router.replace({ name: routeNames.productList, query: next });
  }

  function replaceQueryResettingCursors(patch: QueryPatch) {
    replaceQuery({
      ...patch,
      after: undefined,
      before: undefined,
      page: undefined,
    });
  }

  function setSearch(q: string) {
    replaceQueryResettingCursors({ q: blankToUndefined(q) });
  }

  function setSort(sort: ProductSort) {
    replaceQueryResettingCursors({ sort });
  }

  function setOrder(order: ProductOrder) {
    replaceQueryResettingCursors({ order });
  }

  function setListing(patch: Pick<QueryPatch, "q" | "sort" | "order">) {
    replaceQueryResettingCursors(patch);
  }

  function clearFilters() {
    replaceQueryResettingCursors({
      q: undefined,
      sort: "name",
      order: "asc",
    });
  }

  function goToPage(page: number) {
    replaceQuery({
      page: page > 1 ? String(page) : undefined,
      after: undefined,
      before: undefined,
    });
  }

  return {
    query,
    setSearch,
    setSort,
    setOrder,
    setListing,
    clearFilters,
    goToPage,
  };
}

export type { ListProductsQuery };
