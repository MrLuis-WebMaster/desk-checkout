<script setup lang="ts">
import { useTemplateRef } from "vue";
import type { Component } from "vue";
import UiIcon from "@/shared/ui/UiIcon.vue";

withDefaults(
  defineProps<{
    icon: Component;
    label: string;
    type?: "button" | "submit";
    disabled?: boolean;
    size?: number;
    variant?: "ghost" | "outline" | "quiet" | "pill";
  }>(),
  {
    type: "button",
    disabled: false,
    size: 20,
    variant: "ghost",
  },
);

const button = useTemplateRef<HTMLButtonElement>("button");

defineExpose({
  focus: () => button.value?.focus(),
});
</script>

<template>
  <button
    ref="button"
    :type="type"
    :disabled="disabled"
    :aria-label="label"
    class="inline-flex size-11 shrink-0 items-center justify-center transition-colors duration-200 ease-out-quart hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-40"
    :class="{
      'rounded-control': variant !== 'pill',
      'rounded-full': variant === 'pill',
      'border border-line': variant === 'outline',
      'text-muted hover:text-ink': variant === 'quiet',
    }"
  >
    <UiIcon :icon="icon" :size="size" />
    <slot />
  </button>
</template>
