<script setup lang="ts">
import { onMounted, onScopeDispose, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { CreditCard } from "@lucide/vue";
import type { ProductDto } from "@checkout/contracts";
import { routeNames } from "@/app/router";
import { getProduct } from "@/modules/catalog/composition/index";
import { screenMessage } from "@/modules/catalog/application/results/screen-result";
import { toProductIdParam } from "@/modules/catalog/presentation/mappers/catalog-route.mapper";
import { useCheckoutStore } from "@/modules/checkout/presentation/stores/checkout.store";
import {
  productImageFallback,
  productImageSrc,
} from "@/shared/presentation/product-image";
import { UiAlert, UiButton, UiIcon, UiPrice, UiSkeleton } from "@/shared/ui";

const route = useRoute(routeNames.checkout);
const checkout = useCheckoutStore();
const product = ref<ProductDto | null>(null);
const loading = ref(false);
const errorMessage = ref("");
let loadAbort: AbortController | null = null;

const steps = ["Product", "Payment", "Summary"] as const;

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

async function load(rawId: string | string[]) {
  loadAbort?.abort();
  const controller = new AbortController();
  loadAbort = controller;

  const productId = toProductIdParam(rawId);
  loading.value = true;
  errorMessage.value = "";
  product.value = null;

  if (!productId) {
    loading.value = false;
    errorMessage.value = screenMessage({ status: "not_found" });
    return;
  }

  checkout.startPayment(productId);
  const result = await getProduct(productId, controller.signal);
  if (controller.signal.aborted || result.status === "aborted") {
    return;
  }
  loading.value = false;

  if (result.status !== "ok") {
    errorMessage.value = screenMessage(result);
    return;
  }

  product.value = result.value;
}

onMounted(() => {
  void load(route.params.id);
});

watch(
  () => route.params.id,
  (id) => {
    void load(id);
  },
);

onScopeDispose(() => {
  loadAbort?.abort();
});
</script>

<template>
  <main>
    <h1 class="text-2xl font-semibold tracking-tight">Payment</h1>
    <ol class="mt-3 flex gap-4 text-sm" aria-label="Checkout steps">
      <li
        v-for="(step, index) in steps"
        :key="step"
        :aria-current="step === 'Payment' ? 'step' : undefined"
        :class="step === 'Payment' ? 'font-semibold text-ink' : 'text-muted'"
      >
        {{ index + 1 }}. {{ step }}
      </li>
    </ol>

    <div v-if="loading" class="mt-6 grid gap-3" aria-busy="true">
      <span class="sr-only">Loading checkout</span>
      <UiSkeleton class="h-16 w-full" />
      <UiSkeleton class="h-11 w-full" />
    </div>

    <UiAlert v-else-if="errorMessage" class="mt-6">{{ errorMessage }}</UiAlert>

    <template v-else-if="product">
      <section class="mt-6 flex gap-3 border-y border-line py-3">
        <img
          :src="productImageSrc(product.imageUrl)"
          :alt="product.name"
          width="64"
          height="64"
          class="size-16 rounded-control bg-sunken object-cover"
          @error="onProductImageError($event, product.imageUrl)"
        />
        <div>
          <p class="font-medium">{{ product.name }}</p>
          <UiPrice :amount="product.price" size="md" class="mt-1" />
        </div>
      </section>

      <section class="mt-6">
        <h2 class="text-sm font-medium">Method</h2>
        <p
          class="mt-2 flex min-h-11 items-center gap-2 rounded-control border border-ink bg-surface px-3"
        >
          <UiIcon :icon="CreditCard" />
          Credit card
        </p>
        <p class="mt-2 max-w-[65ch] text-sm text-muted">
          Card payment is not available yet. You can review this order, but
          nothing will be charged.
        </p>
      </section>

      <UiButton class="mt-6 w-full" disabled>Pay with credit card</UiButton>
    </template>
  </main>
</template>
