<script setup lang="ts">
defineProps<{
  id?: string;
  name?: string;
  invalid?: boolean;
  describedBy?: string;
}>();

const model = defineModel<string>({ required: true });
</script>

<template>
  <select
    :id="id"
    v-model="model"
    :name="name"
    :aria-invalid="invalid || undefined"
    :aria-describedby="describedBy"
    class="min-h-11 w-full rounded-control border border-line bg-surface px-3 text-base text-ink transition-colors duration-200 ease-out-quart"
  >
    <slot />
  </select>
</template>
