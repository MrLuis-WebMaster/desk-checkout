<script setup lang="ts">
import { ChevronLeft, ChevronRight } from "@lucide/vue";
import { UiIconButton } from "@/shared/ui";

defineProps<{
  pageCount: number;
  canGoPrev: boolean;
  canGoNext: boolean;
}>();

const pageDraft = defineModel<string>("pageDraft", { required: true });

const emit = defineEmits<{
  jump: [];
  prev: [];
  next: [];
}>();
</script>

<template>
  <nav class="flex" aria-label="Pagination">
    <form
      class="inline-flex items-center rounded-full border border-line bg-surface"
      @submit.prevent="emit('jump')"
    >
      <UiIconButton
        :icon="ChevronLeft"
        :size="18"
        variant="pill"
        label="Previous page"
        :disabled="!canGoPrev"
        @click="emit('prev')"
      />
      <label class="flex items-center gap-2 px-1 text-sm">
        <span class="text-muted">Page</span>
        <input
          v-model="pageDraft"
          type="number"
          inputmode="numeric"
          :min="1"
          :max="pageCount"
          aria-label="Page number"
          class="w-10 bg-transparent text-center font-medium tabular-nums text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          @change="emit('jump')"
        />
        <span class="text-muted">of {{ pageCount }}</span>
      </label>
      <UiIconButton
        :icon="ChevronRight"
        :size="18"
        variant="pill"
        label="Next page"
        :disabled="!canGoNext"
        @click="emit('next')"
      />
    </form>
  </nav>
</template>
