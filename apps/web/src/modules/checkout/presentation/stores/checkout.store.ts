import { defineStore } from "pinia";

export const CHECKOUT_STEPS = ["product", "payment", "result"] as const;

export const CHECKOUT_SCREEN_STEPS = [
  { id: "product", label: "Details" },
  { id: "payment", label: "Payment" },
] as const;

export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

export const useCheckoutStore = defineStore("checkout", {
  state: () => ({
    step: "product" as CheckoutStep,
    /** Pending order to resume after leaving checkout. */
    pendingTransactionId: null as string | null,
    /** Cart fingerprint that must still match to resume payment. */
    pendingCartFingerprint: null as string | null,
  }),
  actions: {
    beginCheckout() {
      this.step = "product";
    },
    startPayment() {
      this.step = "payment";
    },
    rememberPending(transactionId: string, cartFingerprint: string) {
      this.pendingTransactionId = transactionId;
      this.pendingCartFingerprint = cartFingerprint;
      this.step = "payment";
    },
    clearPending() {
      this.pendingTransactionId = null;
      this.pendingCartFingerprint = null;
      this.step = "product";
    },
    reset() {
      this.clearPending();
    },
  },
  persist: {
    pick: ["pendingTransactionId", "pendingCartFingerprint"],
  },
});
