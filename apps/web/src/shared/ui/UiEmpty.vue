<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <div class="grid gap-2 py-10">
    <h2 class="text-lg font-semibold tracking-tight">{{ title }}</h2>
    <p class="max-w-[65ch] text-muted">
      <slot />
    </p>
    <div v-if="$slots.action" class="pt-2">
      <slot name="action" />
    </div>
  </div>
</template>
