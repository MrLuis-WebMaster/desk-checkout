import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { TransactionStatus } from "@checkout/contracts";
import { finalizeCheckout } from "@/modules/checkout/presentation/composables/finalize-checkout";
import { useCartStore } from "@/modules/checkout/presentation/stores/cart.store";
import { useCheckoutStore } from "@/modules/checkout/presentation/stores/checkout.store";

describe("finalizeCheckout", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const cart = useCartStore();
    cart.lines = [
      {
        productId: "p1",
        name: "Lamp",
        price: 10000,
        imageUrl: "/lamp.jpg",
        quantity: 1,
        availableStock: 3,
      },
    ];
    const checkout = useCheckoutStore();
    checkout.rememberPending("tx-1", "fingerprint");
  });

  it("clears cart and pending only when approved", () => {
    useCheckoutStore().saveDraft({
      fullName: "Ada",
      email: "a@b.c",
      phone: "1",
      addressLine: "x",
      city: "BOG",
      shippingMethodId: "s1",
    });
    finalizeCheckout(TransactionStatus.Approved);
    expect(useCartStore().lines).toHaveLength(0);
    expect(useCheckoutStore().pendingTransactionId).toBeNull();
    expect(useCheckoutStore().draft).toBeNull();
  });

  it("does not clear cart on non-approved statuses", () => {
    for (const status of [
      TransactionStatus.Pending,
      TransactionStatus.Declined,
      TransactionStatus.Error,
      TransactionStatus.Expired,
    ]) {
      useCartStore().lines = [
        {
          productId: "p1",
          name: "Lamp",
          price: 10000,
          imageUrl: "/lamp.jpg",
          quantity: 1,
          availableStock: 3,
        },
      ];
      useCheckoutStore().rememberPending("tx-1", "fingerprint");
      finalizeCheckout(status);
      expect(useCartStore().lines).toHaveLength(1);
      expect(useCheckoutStore().pendingTransactionId).toBe("tx-1");
    }
  });
});
