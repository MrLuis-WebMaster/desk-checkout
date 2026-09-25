<script setup lang="ts">
import { useWompiWidget } from "@/modules/checkout/presentation/composables/use-wompi-widget";
import { UiAlert, UiButton } from "@/shared/ui";

const props = defineProps<{
  transactionId: string;
  redirectUrl: string;
  customerEmail?: string;
  customerFullName?: string;
  customerPhone?: string;
}>();

const { loading, errorMessage, openWidget } = useWompiWidget({
  transactionId: () => props.transactionId,
  redirectUrl: () => props.redirectUrl,
  customerEmail: () => props.customerEmail,
  customerFullName: () => props.customerFullName,
  customerPhone: () => props.customerPhone,
});
</script>

<template>
  <div class="grid gap-3">
    <p class="text-sm text-muted">
      Prefer PSE, Nequi, or another method? Continue in Wompi's checkout.
    </p>
    <UiAlert v-if="errorMessage">{{ errorMessage }}</UiAlert>
    <UiButton
      variant="secondary"
      class="w-full"
      :loading="loading"
      @click="openWidget"
    >
      Pay with other methods
    </UiButton>
  </div>
</template>
