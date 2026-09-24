<script setup lang="ts">
import { CreditCard } from "@lucide/vue";
import PaymentUnavailable from "@/modules/checkout/presentation/components/PaymentUnavailable.vue";
import { useCheckout } from "@/modules/checkout/presentation/composables/use-checkout";
import { CHECKOUT_SCREEN_STEPS } from "@/modules/checkout/presentation/stores/checkout.store";
import {
  UiAlert,
  UiIcon,
  UiPrice,
  UiProductImage,
  UiSkeleton,
} from "@/shared/ui";

const { product, loading, errorMessage, step } = useCheckout();
</script>

<template>
  <main class="mx-auto w-full max-w-3xl">
    <h1 class="text-2xl font-semibold tracking-tight">Payment</h1>
    <ol class="mt-3 flex gap-4 text-sm" aria-label="Checkout steps">
      <li
        v-for="(item, index) in CHECKOUT_SCREEN_STEPS"
        :key="item.id"
        :aria-current="step === item.id ? 'step' : undefined"
        :class="step === item.id ? 'font-semibold text-ink' : 'text-muted'"
      >
        {{ index + 1 }}. {{ item.label }}
      </li>
    </ol>

    <div v-if="loading" class="mt-6 grid gap-3" aria-busy="true">
      <span class="sr-only">Loading checkout</span>
      <UiSkeleton class="h-16 w-full" />
      <UiSkeleton class="h-11 w-full" />
    </div>

    <UiAlert v-else-if="errorMessage" class="mt-6">{{ errorMessage }}</UiAlert>

    <div v-else-if="product" class="lg:grid lg:grid-cols-2 lg:items-start lg:gap-12">
      <section class="mt-6 flex gap-3 border-y border-line py-3 lg:mt-8">
        <UiProductImage
          :src="product.imageUrl"
          :alt="product.name"
          width="64"
          height="64"
          class="size-16 rounded-control bg-sunken object-cover"
        />
        <div>
          <p class="font-medium">{{ product.name }}</p>
          <UiPrice :amount="product.price" size="md" class="mt-1" />
        </div>
      </section>

      <div class="lg:mt-8">
        <section class="mt-6 lg:mt-0">
          <h2 class="text-sm font-medium">Method</h2>
          <p
            class="mt-2 flex min-h-11 items-center gap-2 rounded-control border border-ink bg-surface px-3"
          >
            <UiIcon :icon="CreditCard" />
            Credit card
          </p>
          <PaymentUnavailable
            message="Card payment is not available yet. You can review this order, but nothing will be charged."
          />
        </section>
      </div>
    </div>
  </main>
</template>
