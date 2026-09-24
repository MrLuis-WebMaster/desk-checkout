import { defineStore } from "pinia";

export const CHECKOUT_STEPS = [
  "product",
  "payment",
  "summary",
  "result",
] as const;

export const CHECKOUT_SCREEN_STEPS = [
  { id: "product", label: "Product" },
  { id: "payment", label: "Payment" },
  { id: "summary", label: "Summary" },
] as const;

export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

export const useCheckoutStore = defineStore("checkout", {
  state: () => ({
    step: "product" as CheckoutStep,
    productId: "",
  }),
  actions: {
    startPayment(productId: string) {
      this.productId = productId;
      this.step = "payment";
    },
  },
});
