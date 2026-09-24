<script setup lang="ts">
import { CircleAlert } from "@lucide/vue";
import UiIcon from "@/shared/ui/UiIcon.vue";

withDefaults(
  defineProps<{
    tone?: "danger" | "info";
  }>(),
  { tone: "danger" },
);
</script>

<template>
  <div
    role="alert"
    class="flex gap-3 rounded-control border px-3 py-3 text-sm"
    :class="
      tone === 'danger'
        ? 'border-danger/30 bg-danger-bg text-danger'
        : 'border-line bg-sunken text-ink'
    "
  >
    <UiIcon :icon="CircleAlert" class="mt-0.5" />
    <p class="max-w-[65ch]">
      <slot />
    </p>
  </div>
</template>
