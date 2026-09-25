import { computed } from "vue";
import { useCheckoutStore } from "@/modules/checkout/presentation/stores/checkout.store";

export function useCheckout() {
  const checkout = useCheckoutStore();

  return {
    step: computed(() => checkout.step),
    pendingTransactionId: computed(() => checkout.pendingTransactionId),
    pendingCartFingerprint: computed(() => checkout.pendingCartFingerprint),
    startPayment: () => checkout.startPayment(),
    beginCheckout: () => checkout.beginCheckout(),
    rememberPending: (transactionId: string, cartFingerprint: string) =>
      checkout.rememberPending(transactionId, cartFingerprint),
    clearPending: () => checkout.clearPending(),
    reset: () => checkout.reset(),
  };
}
