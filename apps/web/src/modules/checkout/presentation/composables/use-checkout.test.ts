import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useCheckout } from "./use-checkout";
import { useCheckoutStore } from "@/modules/checkout/presentation/stores/checkout.store";

describe("useCheckout", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("exposes store step and pending helpers", () => {
    const checkout = useCheckout();
    expect(checkout.step.value).toBe("product");

    checkout.beginCheckout();
    checkout.startPayment();
    expect(checkout.step.value).toBe("payment");

    checkout.rememberPending("tx-1", "fp");
    expect(checkout.pendingTransactionId.value).toBe("tx-1");
    expect(checkout.pendingCartFingerprint.value).toBe("fp");

    checkout.clearPending();
    expect(checkout.pendingTransactionId.value).toBeNull();
    expect(useCheckoutStore().step).toBe("product");

    checkout.rememberPending("tx-2", "fp2");
    checkout.reset();
    expect(checkout.pendingTransactionId.value).toBeNull();
  });
});
