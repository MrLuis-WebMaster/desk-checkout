<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { ChevronLeft } from "@lucide/vue";
import { routeNames } from "@/app/router";
import { useCheckoutStore } from "@/modules/checkout/presentation/stores/checkout.store";
import { useProduct } from "@/modules/catalog/presentation/composables/use-product";
import {
  productImageFallback,
  productImageSrc,
} from "@/shared/presentation/product-image";
import { UiAlert, UiButton, UiIcon, UiPrice, UiSkeleton } from "@/shared/ui";

const router = useRouter();
const checkout = useCheckoutStore();
const { product, loading, errorMessage } = useProduct();

const outOfStock = computed(
  () => product.value !== null && product.value.availableStock < 1,
);

function onProductImageError(event: Event, imageUrl: string) {
  const img = event.target;
  if (!(img instanceof HTMLImageElement)) {
    return;
  }
  const fallback = productImageFallback(imageUrl);
  if (img.getAttribute("src") === fallback) {
    return;
  }
  img.src = fallback;
}

function continueToPayment() {
  if (!product.value || outOfStock.value) {
    return;
  }
  checkout.startPayment(product.value.id);
  void router.push({
    name: routeNames.checkout,
    params: { id: product.value.id },
  });
}
</script>

<template>
  <main>
    <RouterLink
      :to="{ name: routeNames.productList }"
      class="inline-flex min-h-11 items-center gap-1 text-sm font-medium"
    >
      <UiIcon :icon="ChevronLeft" :size="18" />
      Products
    </RouterLink>

    <div v-if="loading" class="mt-4 grid gap-3" aria-busy="true">
      <span class="sr-only">Loading product</span>
      <UiSkeleton class="aspect-square w-full" />
      <UiSkeleton class="h-7 w-2/3" />
      <UiSkeleton class="h-4 w-full" />
      <UiSkeleton class="h-6 w-1/3" />
    </div>

    <UiAlert v-else-if="errorMessage" class="mt-4">{{ errorMessage }}</UiAlert>

    <template v-else-if="product">
      <img
        :src="productImageSrc(product.imageUrl)"
        :alt="product.name"
        width="640"
        height="640"
        class="mt-3 aspect-square w-full rounded-control bg-sunken object-cover"
        @error="onProductImageError($event, product.imageUrl)"
      />
      <h1 class="mt-4 text-2xl font-semibold tracking-tight">
        {{ product.name }}
      </h1>
      <p class="mt-2 max-w-[65ch] text-muted">{{ product.description }}</p>
      <UiPrice :amount="product.price" class="mt-4" />
      <p class="mt-1 text-sm text-muted">
        {{ product.availableStock }} in stock
      </p>

      <div
        class="sticky bottom-0 -mx-4 mt-6 border-t border-line bg-paper px-4 py-3"
      >
        <UiButton
          class="w-full"
          :disabled="outOfStock"
          @click="continueToPayment"
        >
          {{ outOfStock ? "Out of stock" : "Continue to payment" }}
        </UiButton>
      </div>
    </template>
  </main>
</template>
