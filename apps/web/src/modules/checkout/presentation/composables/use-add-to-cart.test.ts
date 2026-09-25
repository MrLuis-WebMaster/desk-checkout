import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useAddToCart } from "./use-add-to-cart";
import { useCartStore } from "@/modules/checkout/presentation/stores/cart.store";

describe("useAddToCart", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const product = {
    id: "p1",
    name: "Lamp",
    price: 10000,
    imageUrl: "/lamp.jpg",
    availableStock: 2,
  };

  it("rejects add when stock is zero or cart is already at stock", () => {
    const { add } = useAddToCart();
    expect(add({ ...product, availableStock: 0 })).toBe(false);
    expect(useCartStore().lines).toHaveLength(0);

    expect(add(product)).toBe(true);
    expect(add(product)).toBe(true);
    expect(add(product)).toBe(false);
    expect(useCartStore().lines[0]?.quantity).toBe(2);
  });

  it("marks a product as added briefly after a successful add", () => {
    const raf = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb) => {
        cb(0);
        return 0;
      });
    const { add, isAdded } = useAddToCart();

    expect(add(product)).toBe(true);
    expect(isAdded("p1")).toBe(true);

    vi.advanceTimersByTime(500);
    expect(isAdded("p1")).toBe(false);
    raf.mockRestore();
  });
});
