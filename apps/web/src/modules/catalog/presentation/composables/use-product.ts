import { onScopeDispose, ref, watch } from "vue";
import { useRoute } from "vue-router";
import type { ProductDto } from "@checkout/contracts";
import { routeNames } from "@/app/router";
import { getProduct } from "@/modules/catalog/composition/index";
import { screenMessage } from "@/modules/catalog/application/results/screen-result";
import { toProductIdParam } from "@/modules/catalog/presentation/mappers/catalog-route.mapper";

export function useProduct() {
  const route = useRoute(routeNames.product);
  const product = ref<ProductDto | null>(null);
  const loading = ref(false);
  const errorMessage = ref("");
  let loadAbort: AbortController | null = null;

  watch(
    () => route.params.id,
    async (rawId) => {
      loadAbort?.abort();
      const controller = new AbortController();
      loadAbort = controller;

      const productId = toProductIdParam(rawId);
      loading.value = true;
      errorMessage.value = "";
      product.value = null;

      if (!productId) {
        loading.value = false;
        errorMessage.value = screenMessage({ status: "not_found" });
        return;
      }

      const result = await getProduct(productId, controller.signal);
      if (controller.signal.aborted || result.status === "aborted") {
        return;
      }
      loading.value = false;

      if (result.status !== "ok") {
        errorMessage.value = screenMessage(result);
        return;
      }

      product.value = result.value;
    },
    { immediate: true },
  );

  onScopeDispose(() => {
    loadAbort?.abort();
  });

  return {
    product,
    loading,
    errorMessage,
  };
}
