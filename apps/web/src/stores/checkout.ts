import { defineStore } from "pinia";

export type CheckoutStep = "product" | "payment" | "summary" | "result";

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
  },
});
