<script setup lang="ts">
defineProps<{
  id?: string;
  name?: string;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
}>();

const model = defineModel<string>({ required: true });
</script>

<template>
  <select
    :id="id"
    v-model="model"
    :name="name"
    :disabled="disabled"
    :aria-invalid="invalid || undefined"
    :aria-describedby="describedBy"
    class="min-h-11 w-full rounded-control border bg-surface px-3 text-base text-ink transition-colors duration-200 ease-out-quart disabled:cursor-not-allowed disabled:opacity-50"
    :class="
      invalid
        ? 'border-danger focus:outline-danger'
        : 'border-line'
    "
  >
    <slot />
  </select>
</template>
