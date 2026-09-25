import { computed } from "vue";
import {
  useCheckoutStore,
  type CheckoutDraft,
} from "@/modules/checkout/presentation/stores/checkout.store";

export function useCheckout() {
  const checkout = useCheckoutStore();

  return {
    step: computed(() => checkout.step),
    pendingTransactionId: computed(() => checkout.pendingTransactionId),
    pendingCartFingerprint: computed(() => checkout.pendingCartFingerprint),
    draft: computed(() => checkout.draft),
    startPayment: () => checkout.startPayment(),
    beginCheckout: () => checkout.beginCheckout(),
    saveDraft: (draft: CheckoutDraft) => checkout.saveDraft(draft),
    clearDraft: () => checkout.clearDraft(),
    rememberPending: (transactionId: string, cartFingerprint: string) =>
      checkout.rememberPending(transactionId, cartFingerprint),
    clearPending: () => checkout.clearPending(),
    reset: () => checkout.reset(),
  };
}
