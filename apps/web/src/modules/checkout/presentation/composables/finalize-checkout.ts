import { TransactionStatus } from "@checkout/contracts";
import { useCartStore } from "@/modules/checkout/presentation/stores/cart.store";
import { useCheckoutStore } from "@/modules/checkout/presentation/stores/checkout.store";

/**
 * Single policy for cart/pending cleanup after a known payment status.
 * Only APPROVED clears the cart and pending checkout state.
 */
export function finalizeCheckout(status: TransactionStatus): void {
  if (status !== TransactionStatus.Approved) {
    return;
  }
  useCartStore().clear();
  useCheckoutStore().reset();
}
