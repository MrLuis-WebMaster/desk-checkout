import { computed } from "vue";
import { routeNames } from "@/app/router";
import { useProduct } from "@/modules/catalog/presentation/composables/use-product";
import { useCheckoutStore } from "@/modules/checkout/presentation/stores/checkout.store";

export function useCheckout() {
  const checkout = useCheckoutStore();
  const productState = useProduct(routeNames.checkout, (productId) => {
    checkout.startPayment(productId);
  });

  return {
    ...productState,
    step: computed(() => checkout.step),
  };
}
