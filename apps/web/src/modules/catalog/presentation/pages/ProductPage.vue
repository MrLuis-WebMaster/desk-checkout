<script setup lang="ts">
import { computed } from "vue";
import { Check, ChevronLeft } from "@lucide/vue";
import { routeNames } from "@/app/router";
import { useAddToCart } from "@/modules/checkout/presentation/composables/use-add-to-cart";
import { useCartStore } from "@/modules/checkout/presentation/stores/cart.store";
import { useProduct } from "@/modules/catalog/presentation/composables/use-product";
import { formatCop } from "@/shared/presentation/format-cop";
import { UiAlert, UiButton, UiIcon, UiProductImage, UiSkeleton } from "@/shared/ui";

const cart = useCartStore();
const { add, isAdded } = useAddToCart();
const { product, loading, errorMessage } = useProduct();

const outOfStock = computed(
  () => product.value !== null && product.value.availableStock < 1,
);

function addToCart() {
  if (!product.value) {
    return;
  }
  add(product.value);
}
</script>

<template>
  <main>
    <nav aria-label="Breadcrumb" class="text-sm text-muted">
      <ol class="flex min-h-11 flex-wrap items-center gap-1.5">
        <li>
          <RouterLink
            :to="{ name: routeNames.productList }"
            class="inline-flex items-center gap-1 hover:text-ink"
          >
            <UiIcon :icon="ChevronLeft" :size="16" />
            Products
          </RouterLink>
        </li>
        <li v-if="product" aria-hidden="true">/</li>
        <li v-if="product" class="truncate text-ink" aria-current="page">
          {{ product.name }}
        </li>
      </ol>
    </nav>

    <div
      v-if="loading"
      class="mt-2 grid gap-6 lg:grid-cols-[minmax(0,36rem)_minmax(18rem,24rem)] lg:justify-between lg:gap-16"
      aria-busy="true"
    >
      <span class="sr-only">Loading product</span>
      <UiSkeleton class="aspect-square w-full rounded-[1.25rem]" />
      <div class="grid content-start gap-3">
        <UiSkeleton class="h-8 w-2/3" />
        <UiSkeleton class="h-4 w-full" />
        <UiSkeleton class="h-12 w-full" />
        <UiSkeleton class="h-12 w-full" />
      </div>
    </div>

    <UiAlert v-else-if="errorMessage" class="mt-4">{{ errorMessage }}</UiAlert>

    <div
      v-else-if="product"
      class="mt-2 grid gap-6 pb-36 lg:grid-cols-[minmax(0,36rem)_minmax(18rem,24rem)] lg:items-start lg:justify-between lg:gap-16 lg:pb-0"
    >
      <div class="rounded-[1.25rem] bg-sunken p-6 sm:p-10">
        <UiProductImage
          :src="product.imageUrl"
          :alt="product.name"
          width="640"
          height="640"
          class="mx-auto aspect-square w-full object-contain"
        />
      </div>

      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          {{ product.name }}
        </h1>
        <p class="mt-2 max-w-[65ch] text-sm text-muted">
          {{ product.description }}
        </p>

        <div class="mt-6 grid gap-5">
          <div>
            <h2 class="text-sm">Price</h2>
            <p
              class="mt-2 flex min-h-12 items-center justify-center rounded-control bg-ink px-3 text-xl font-semibold tabular-nums tracking-tight text-paper"
            >
              {{ formatCop(product.price) }}
            </p>
          </div>
          <div>
            <h2 class="text-sm">Availability</h2>
            <p
              class="mt-2 flex min-h-12 items-center justify-center rounded-control border border-line bg-surface px-3 text-sm"
            >
              {{
                outOfStock
                  ? "Out of stock"
                  : `${product.availableStock} in stock`
              }}
            </p>
          </div>
        </div>

        <div
          class="fixed inset-x-0 bottom-0 z-20 flex flex-col-reverse gap-3 border-t border-line bg-paper px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:static lg:z-auto lg:mt-6 lg:flex lg:flex-col lg:gap-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0"
        >
          <UiButton
            class="w-full"
            :class="product && isAdded(product.id) ? 'animate-add-pop' : ''"
            :disabled="outOfStock"
            @click="addToCart"
          >
            <UiIcon v-if="product && isAdded(product.id)" :icon="Check" :size="18" />
            {{
              outOfStock
                ? "Out of stock"
                : product && isAdded(product.id)
                  ? "Added"
                  : "Add to cart"
            }}
          </UiButton>
          <button
            type="button"
            class="inline-flex min-h-11 items-center text-sm font-medium hover:underline lg:mt-3"
            @click="cart.open()"
          >
            View cart
          </button>
        </div>
      </div>
    </div>
  </main>
</template>
