<script setup lang="ts">
import { X } from "@lucide/vue";
import UiIcon from "@/shared/ui/UiIcon.vue";

defineProps<{
  identifier: string;
  value: string;
  removeLabel: string;
}>();

defineEmits<{
  remove: [];
}>();
</script>

<template>
  <span
    class="inline-flex min-h-11 items-center rounded-control border border-line bg-surface pl-3"
  >
    <span class="text-sm">
      <span class="text-muted">{{ identifier }}: </span>{{ value }}
    </span>
    <button
      type="button"
      class="inline-flex size-11 items-center justify-center text-ink"
      :aria-label="removeLabel"
      @click="$emit('remove')"
    >
      <UiIcon :icon="X" :size="16" />
    </button>
  </span>
</template>
