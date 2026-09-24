import { defineStore } from "pinia";

export const CHECKOUT_STEPS = [
  "product",
  "payment",
  "summary",
  "result",
] as const;

export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

export const useCheckoutStore = defineStore("checkout", {
  state: () => ({
    step: "product" as CheckoutStep,
    productId: "",
  }),
  actions: {
    openProduct(productId: string) {
      this.productId = productId;
      this.step = "product";
    },
    startPayment(productId: string) {
      this.productId = productId;
      this.step = "payment";
    },
  },
});
