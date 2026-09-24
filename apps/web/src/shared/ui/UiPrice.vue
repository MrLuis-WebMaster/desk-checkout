<script setup lang="ts">
import { formatCop } from "@/shared/presentation/format-cop";

withDefaults(
  defineProps<{
    amount: number;
    size?: "md" | "lg";
  }>(),
  { size: "lg" },
);
</script>

<template>
  <p
    class="font-semibold tabular-nums tracking-tight text-ink"
    :class="size === 'lg' ? 'text-xl' : 'text-base'"
  >
    {{ formatCop(amount) }}
  </p>
</template>
