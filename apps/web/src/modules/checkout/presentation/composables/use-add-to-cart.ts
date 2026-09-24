import { ref } from "vue";
import { useCartStore } from "@/modules/checkout/presentation/stores/cart.store";

type CartProductInput = {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  availableStock: number;
};

export function useAddToCart() {
  const cart = useCartStore();
  const addedIds = ref<Record<string, number>>({});

  function add(product: CartProductInput) {
    if (product.availableStock < 1) {
      return false;
    }
    const increased = cart.add({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      availableStock: product.availableStock,
    });
    if (!increased) {
      return false;
    }
    const stamp = Date.now();
    addedIds.value = { ...addedIds.value, [product.id]: 0 };
    requestAnimationFrame(() => {
      addedIds.value = { ...addedIds.value, [product.id]: stamp };
    });
    window.setTimeout(() => {
      if (addedIds.value[product.id] !== stamp) {
        return;
      }
      const next = { ...addedIds.value };
      delete next[product.id];
      addedIds.value = next;
    }, 500);
    return true;
  }

  function isAdded(id: string) {
    return Boolean(addedIds.value[id]);
  }

  return { add, isAdded };
}
