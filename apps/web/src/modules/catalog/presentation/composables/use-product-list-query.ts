import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  PRODUCT_LIST_OFFSET_PAGE_MAX,
  type ListProductsQuery,
  type ProductOrder,
  type ProductSort,
} from "@checkout/contracts";
import { routeNames } from "@/app/router";
import { toListProductsQuery } from "@/modules/catalog/presentation/mappers/catalog-route.mapper";
import {
  mergeProductListQuery,
  searchClearsIds,
  type ProductListQueryPatch,
} from "@/modules/catalog/presentation/mappers/product-list-query-merge";

export function useProductListQuery() {
  const route = useRoute(routeNames.productList);
  const router = useRouter();

  const query = computed(() => toListProductsQuery(route.query));
  const cursorMode = computed(
    () => Boolean(query.value.after || query.value.before),
  );
  const idsMode = computed(() => Boolean(query.value.ids?.length));

  function replaceQuery(patch: ProductListQueryPatch) {
    const next = mergeProductListQuery(query.value, patch);
    void router.replace({ name: routeNames.productList, query: next });
  }

  function replaceQueryResettingCursors(patch: ProductListQueryPatch) {
    replaceQuery({
      ...patch,
      after: undefined,
      before: undefined,
      page: undefined,
    });
  }

  function setSearch(q: string) {
    replaceQuery(searchClearsIds(q));
  }

  function setSort(sort: ProductSort) {
    replaceQueryResettingCursors({ sort });
  }

  function setOrder(order: ProductOrder) {
    replaceQueryResettingCursors({ order });
  }

  function setListing(patch: Pick<ProductListQueryPatch, "q" | "sort" | "order">) {
    replaceQueryResettingCursors({
      ...patch,
      ...(patch.q !== undefined ? { ids: null } : {}),
    });
  }

  function clearFilters() {
    replaceQueryResettingCursors({
      q: undefined,
      ids: null,
      sort: "name",
      order: "asc",
    });
  }

  function goToPage(page: number) {
    if (idsMode.value) {
      return;
    }
    const clamped = Math.min(
      Math.max(1, page),
      PRODUCT_LIST_OFFSET_PAGE_MAX,
    );
    replaceQuery({
      page: clamped > 1 ? String(clamped) : undefined,
      after: undefined,
      before: undefined,
    });
  }

  function goAfter(cursor: string) {
    if (idsMode.value) {
      return;
    }
    replaceQuery({
      after: cursor,
      before: undefined,
      page: undefined,
    });
  }

  function goBefore(cursor: string) {
    if (idsMode.value) {
      return;
    }
    replaceQuery({
      before: cursor,
      after: undefined,
      page: undefined,
    });
  }

  return {
    query,
    cursorMode,
    idsMode,
    setSearch,
    setSort,
    setOrder,
    setListing,
    clearFilters,
    goToPage,
    goAfter,
    goBefore,
  };
}

export type { ListProductsQuery };
