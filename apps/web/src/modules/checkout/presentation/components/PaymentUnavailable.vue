<script setup lang="ts">
import { UiButton } from "@/shared/ui";

defineProps<{
  message: string;
}>();
</script>

<template>
  <p class="mt-2 max-w-[65ch] text-sm text-muted">{{ message }}</p>
  <UiButton class="mt-4 w-full" disabled>Pay with credit card</UiButton>
</template>
