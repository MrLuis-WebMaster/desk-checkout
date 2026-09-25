<script setup lang="ts">
import { CreditCard } from "@lucide/vue";
import type { CardBrand } from "@/modules/checkout/infrastructure/card-number";

defineProps<{
  brand: CardBrand;
}>();

const labels: Record<CardBrand, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  unknown: "Card",
};
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 text-sm text-muted"
    :aria-label="labels[brand]"
  >
    <svg
      v-if="brand === 'visa'"
      class="h-5 w-8"
      viewBox="0 0 48 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="48" height="32" rx="4" fill="#1A1F71" />
      <path
        fill="#fff"
        d="M19.5 21.2h-2.6l1.6-10.4h2.6l-1.6 10.4zm11.1-10.1c-.5-.2-1.4-.5-2.5-.5-2.7 0-4.7 1.5-4.7 3.6 0 1.6 1.4 2.4 2.5 2.9 1.1.5 1.5.9 1.5 1.4 0 .7-.8 1.1-1.6 1.1-1.1 0-1.6-.2-2.5-.6l-.3-.2-.4 2.3c.7.3 1.9.6 3.2.6 3 0 4.9-1.4 4.9-3.7 0-1.2-.7-2.2-2.4-3-1-.5-1.6-.9-1.6-1.4 0-.5.5-.9 1.6-.9.9 0 1.5.2 2 .4l.2.1.4-2.1zm7.5 10.1h2.3l-2-10.4h-2.1c-.5 0-.9.3-1.1.7l-3.9 9.7h2.8l.5-1.5h3.4l.1 1.5zm-2.9-3.6 1.4-3.9.8 3.9h-2.2zm-16.3-6.8-2.7 7.2-.3-1.5c-.5-1.7-2.1-3.5-3.9-4.4l2.5 9.1h2.8l4.2-10.4h-2.6z"
      />
      <path
        fill="#F9A61A"
        d="M10.2 10.8H7.5L5 21.2h2.7c.5-1.4.9-2.5 1.5-4.1.1-.2.2-.3.5-.3h2.1c2.2 0 3.5-1 3.1-2.9-.1-1.7-1.7-2.1-4.7-2.1z"
      />
    </svg>
    <svg
      v-else-if="brand === 'mastercard'"
      class="h-5 w-8"
      viewBox="0 0 48 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="48" height="32" rx="4" fill="#252525" />
      <circle cx="19" cy="16" r="8" fill="#EB001B" />
      <circle cx="29" cy="16" r="8" fill="#F79E1B" />
      <path
        fill="#FF5F00"
        d="M24 10.2a8 8 0 0 1 0 11.6 8 8 0 0 1 0-11.6z"
      />
    </svg>
    <svg
      v-else-if="brand === 'amex'"
      class="h-5 w-8"
      viewBox="0 0 48 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="48" height="32" rx="4" fill="#2E77BC" />
      <path
        fill="#fff"
        d="M8.5 20.5 11 11.5h3.2l1.2 2.9 1.2-2.9h3.1l2.5 9H19l-.5-1.5h-3.4l-.5 1.5h-2.8l1.7-3.9-1.8 3.9H8.5zm7.2-3.6h2.2l-1.1-3.1-1.1 3.1zM25 20.5V11.5h4.6c1.1 0 1.9.2 2.5.7.5.4.8 1 .8 1.8 0 .7-.3 1.3-.8 1.7-.3.2-.7.4-1.2.5l2.3 4.3h-3l-2-3.9h-.9v3.9H25zm3.1-5.5h1.4c.5 0 .8-.1 1-.3.2-.2.3-.4.3-.7 0-.3-.1-.5-.3-.7-.2-.2-.5-.3-1-.3h-1.4v2zM36.2 20.5l2.6-4.5-2.6-4.5h3.2l1.4 2.7 1.4-2.7h3l-2.6 4.5 2.6 4.5h-3.2l-1.4-2.7-1.4 2.7h-3z"
      />
    </svg>
    <CreditCard
      v-else
      class="size-5 text-muted"
      :stroke-width="1.75"
      aria-hidden="true"
    />
    <span class="sr-only">{{ labels[brand] }}</span>
  </span>
</template>
