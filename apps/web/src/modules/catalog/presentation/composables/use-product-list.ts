import { onScopeDispose, ref, watch, type Ref } from "vue";
import type { ListProductsQuery, ProductSummaryDto } from "@checkout/contracts";
import { listProducts } from "@/modules/catalog/composition/index";
import { screenMessage } from "@/modules/catalog/application/results/screen-result";

export function useProductList(query: Ref<ListProductsQuery>) {
  const items = ref<ProductSummaryDto[]>([]);
  const total = ref(0);
  const nextCursor = ref<string | null>(null);
  const prevCursor = ref<string | null>(null);
  const loading = ref(false);
  const errorMessage = ref("");
  let loadAbort: AbortController | null = null;

  async function load(current: ListProductsQuery) {
    loadAbort?.abort();
    const controller = new AbortController();
    loadAbort = controller;

    loading.value = true;
    errorMessage.value = "";

    const result = await listProducts(current, controller.signal);
    if (controller.signal.aborted || result.status === "aborted") {
      return;
    }
    loading.value = false;

    if (result.status !== "ok") {
      items.value = [];
      total.value = 0;
      nextCursor.value = null;
      prevCursor.value = null;
      errorMessage.value = screenMessage(result);
      return;
    }

    items.value = result.value.items;
    total.value = result.value.total;
    nextCursor.value = result.value.nextCursor;
    prevCursor.value = result.value.prevCursor;
  }

  watch(
    query,
    (current) => {
      void load(current);
    },
    { immediate: true, deep: true },
  );

  onScopeDispose(() => {
    loadAbort?.abort();
  });

  return {
    items,
    total,
    nextCursor,
    prevCursor,
    loading,
    errorMessage,
  };
}
