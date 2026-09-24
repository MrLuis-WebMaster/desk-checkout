<script setup lang="ts">
import type { Component } from "vue";
import UiIcon from "@/shared/ui/UiIcon.vue";

withDefaults(
  defineProps<{
    icon: Component;
    label: string;
    type?: "button" | "submit";
    disabled?: boolean;
  }>(),
  { type: "button", disabled: false },
);
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :aria-label="label"
    class="inline-flex size-11 items-center justify-center rounded-control bg-sunken text-ink transition-colors duration-200 ease-out-quart hover:bg-line disabled:cursor-not-allowed disabled:opacity-50"
  >
    <UiIcon :icon="icon" />
  </button>
</template>
