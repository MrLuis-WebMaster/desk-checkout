<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: "button" | "submit";
    variant?: "primary" | "secondary" | "ghost";
    disabled?: boolean;
    loading?: boolean;
  }>(),
  {
    type: "button",
    variant: "primary",
    disabled: false,
    loading: false,
  },
);
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    class="inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 text-base font-medium transition-colors duration-200 ease-out-quart disabled:cursor-not-allowed disabled:opacity-50"
    :class="{
      'bg-accent text-on-accent hover:bg-accent-hover': variant === 'primary',
      'bg-sunken text-ink hover:bg-line': variant === 'secondary',
      'bg-transparent text-ink hover:bg-sunken': variant === 'ghost',
    }"
  >
    <slot />
  </button>
</template>
