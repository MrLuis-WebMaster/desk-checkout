import { defineStore } from "pinia";
import { computeLineSubtotal } from "@checkout/contracts";
import {
  parseStoredLines,
  type CartLine,
} from "@/modules/checkout/presentation/stores/cart-storage";

const STORAGE_KEY = "ecommerce-cart";
let openAfterAdd = 0;

export type { CartLine };

type CartProduct = Omit<CartLine, "quantity">;

export const useCartStore = defineStore("cart", {
  state: () => ({
    lines: [] as CartLine[],
    isOpen: false,
  }),
  getters: {
    count(state): number {
      return state.lines.reduce((total, line) => total + line.quantity, 0);
    },
    subtotal(state): number {
      return state.lines.reduce(
        (total, line) =>
          total + computeLineSubtotal(line.price, line.quantity),
        0,
      );
    },
  },
  actions: {
    open() {
      this.isOpen = true;
    },
    close() {
      this.isOpen = false;
    },
    /** Returns true when quantity increased. */
    add(product: CartProduct): boolean {
      if (product.availableStock < 1) {
        return false;
      }
      const existing = this.lines.find(
        (line) => line.productId === product.productId,
      );
      if (existing) {
        if (existing.quantity >= product.availableStock) {
          existing.availableStock = product.availableStock;
          return false;
        }
        existing.quantity += 1;
        existing.availableStock = product.availableStock;
        existing.name = product.name;
        existing.price = product.price;
        existing.imageUrl = product.imageUrl;
      } else {
        this.lines.push({ ...product, quantity: 1 });
      }
      window.clearTimeout(openAfterAdd);
      openAfterAdd = window.setTimeout(() => this.open(), 280);
      return true;
    },
    setQuantity(productId: string, quantity: number) {
      const line = this.lines.find((item) => item.productId === productId);
      if (!line) {
        return;
      }
      line.quantity = Math.min(Math.max(1, quantity), line.availableStock);
      this.open();
    },
    remove(productId: string) {
      this.lines = this.lines.filter((line) => line.productId !== productId);
      this.open();
    },
    clear() {
      this.lines = [];
    },
  },
  persist: {
    key: STORAGE_KEY,
    pick: ["lines"],
    serializer: {
      serialize: JSON.stringify,
      deserialize: (raw) => ({ lines: parseStoredLines(raw) }),
    },
  },
});
