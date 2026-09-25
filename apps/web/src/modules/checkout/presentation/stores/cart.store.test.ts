import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useCartStore } from "./cart.store";

describe("useCartStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const product = {
    productId: "p1",
    name: "Lamp",
    price: 10000,
    imageUrl: "/lamp.jpg",
    availableStock: 2,
  };

  it("rejects add when stock is zero", () => {
    const cart = useCartStore();
    expect(cart.add({ ...product, availableStock: 0 })).toBe(false);
    expect(cart.lines).toHaveLength(0);
  });

  it("rejects adding past available stock", () => {
    const cart = useCartStore();
    expect(cart.add(product)).toBe(true);
    expect(cart.add(product)).toBe(true);
    expect(cart.add(product)).toBe(false);
    expect(cart.lines[0]?.quantity).toBe(2);
  });

  it("clamps setQuantity to available stock", () => {
    const cart = useCartStore();
    cart.add(product);
    cart.setQuantity("p1", 99);
    expect(cart.lines[0]?.quantity).toBe(2);
    cart.setQuantity("p1", 0);
    expect(cart.lines[0]?.quantity).toBe(1);
  });

  it("computes count and subtotal", () => {
    const cart = useCartStore();
    cart.add(product);
    cart.add(product);
    expect(cart.count).toBe(2);
    expect(cart.subtotal).toBe(20000);
  });
});
