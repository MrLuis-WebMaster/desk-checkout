<script setup lang="ts">
import { useCheckoutResult } from "@/modules/checkout/presentation/composables/use-checkout-result";
import { formatCop } from "@/shared/presentation/format-cop";
import { UiAlert, UiButton, UiIcon, UiSkeleton } from "@/shared/ui";

const {
  loading,
  errorMessage,
  lines,
  merchandiseTotal,
  baseFee,
  deliveryFee,
  shippingCityLabel,
  total,
  deliveryStatus,
  view,
  toneClass,
  iconWrapClass,
  purchasedCta,
  goCatalog,
} = useCheckoutResult();
</script>

<template>
  <main class="mx-auto w-full max-w-lg">
    <div v-if="loading" class="mt-2 grid gap-4" aria-busy="true">
      <span class="sr-only">Confirming payment</span>
      <UiSkeleton class="h-12 w-12 rounded-control" />
      <UiSkeleton class="h-8 w-3/5" />
      <UiSkeleton class="h-16 w-full" />
      <UiSkeleton class="h-11 w-full" />
    </div>

    <div v-else-if="errorMessage" class="mt-2 grid gap-6">
      <UiAlert>{{ errorMessage }}</UiAlert>
      <UiButton class="w-full" variant="secondary" @click="goCatalog">
        Back to catalog
      </UiButton>
    </div>

    <template v-else-if="view">
      <div
        class="inline-flex size-12 items-center justify-center rounded-control"
        :class="iconWrapClass"
        aria-hidden="true"
      >
        <UiIcon :icon="view.icon" :size="24" />
      </div>

      <h1
        class="mt-5 text-2xl font-semibold tracking-tight"
        :class="toneClass"
      >
        {{ view.title }}
      </h1>
      <p class="mt-2 max-w-[65ch] text-muted">{{ view.detail }}</p>
      <p
        v-if="deliveryStatus"
        class="mt-3 text-sm text-muted"
      >
        Delivery status: {{ deliveryStatus }}
      </p>

      <section
        class="mt-8 border-y border-line py-4"
        aria-label="Order summary"
      >
        <ul class="grid gap-3">
          <li
            v-for="line in lines"
            :key="line.productId"
            class="flex items-baseline justify-between gap-4"
          >
            <p class="min-w-0">
              <span class="font-medium">{{ line.productName }}</span>
              <span class="mt-0.5 block text-sm text-muted">
                Qty {{ line.quantity }}
                <template v-if="line.quantity > 1">
                  · {{ formatCop(line.productPrice) }} each
                </template>
              </span>
            </p>
            <p class="shrink-0 tabular-nums text-muted">
              {{ formatCop(line.productPrice * line.quantity) }}
            </p>
          </li>
        </ul>
        <dl class="mt-4 grid gap-1 border-t border-line pt-4 text-sm">
          <div class="flex justify-between gap-4 text-muted">
            <dt>Subtotal</dt>
            <dd class="tabular-nums">{{ formatCop(merchandiseTotal) }}</dd>
          </div>
          <div class="flex justify-between gap-4 text-muted">
            <dt>Base fee</dt>
            <dd class="tabular-nums">{{ formatCop(baseFee) }}</dd>
          </div>
          <div class="flex justify-between gap-4 text-muted">
            <dt>
              Shipping
              <template v-if="shippingCityLabel">
                to {{ shippingCityLabel }}
              </template>
            </dt>
            <dd class="tabular-nums">{{ formatCop(deliveryFee) }}</dd>
          </div>
          <div
            class="mt-3 flex items-baseline justify-between gap-4 border-t border-line pt-4"
          >
            <dt class="text-muted">Total</dt>
            <dd class="text-xl font-semibold tabular-nums text-ink">
              {{ formatCop(total) }}
            </dd>
          </div>
        </dl>
      </section>

      <div class="mt-8 grid gap-3">
        <UiButton class="w-full" @click="view.primaryAction">
          {{ view.primaryLabel }}
        </UiButton>
        <UiButton
          v-if="view.secondaryLabel && view.secondaryAction"
          class="w-full"
          variant="secondary"
          @click="view.secondaryAction"
        >
          {{ view.secondaryLabel }}
        </UiButton>
        <RouterLink
          v-if="purchasedCta"
          :to="purchasedCta.to"
          class="block text-center text-sm font-medium text-ink underline"
        >
          {{ purchasedCta.label }}
        </RouterLink>
      </div>
    </template>
  </main>
</template>
