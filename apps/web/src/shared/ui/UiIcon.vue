<script setup lang="ts">
import type { Component } from "vue";

withDefaults(
  defineProps<{
    icon: Component;
    size?: number;
  }>(),
  { size: 20 },
);
</script>

<template>
  <component
    :is="icon"
    :size="size"
    :stroke-width="1.75"
    aria-hidden="true"
    class="shrink-0"
  />
</template>
