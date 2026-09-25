import { defineStore } from "pinia";
import type { ShippingCityCode } from "@checkout/contracts";

export const CHECKOUT_STEPS = ["product", "payment", "result"] as const;

export const CHECKOUT_SCREEN_STEPS = [
  { id: "product", label: "Details" },
  { id: "payment", label: "Payment" },
] as const;

export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

/** Delivery draft persisted without card PAN/CVC/expiry. */
export type CheckoutDraft = {
  fullName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: ShippingCityCode;
  shippingMethodId: string;
};

export const useCheckoutStore = defineStore("checkout", {
  state: () => ({
    step: "product" as CheckoutStep,
    /** Pending order to resume after leaving checkout. */
    pendingTransactionId: null as string | null,
    /** Cart fingerprint that must still match to resume payment. */
    pendingCartFingerprint: null as string | null,
    /** Customer/delivery draft (no payment card fields). */
    draft: null as CheckoutDraft | null,
  }),
  actions: {
    beginCheckout() {
      this.step = "product";
    },
    startPayment() {
      this.step = "payment";
    },
    saveDraft(draft: CheckoutDraft) {
      this.draft = { ...draft };
    },
    clearDraft() {
      this.draft = null;
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
      this.clearDraft();
    },
  },
  persist: {
    pick: [
      "pendingTransactionId",
      "pendingCartFingerprint",
      "draft",
      "step",
    ],
  },
});
