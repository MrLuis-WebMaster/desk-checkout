<script setup lang="ts">
withDefaults(
  defineProps<{
    id?: string;
    type?: string;
    name?: string;
    placeholder?: string;
    maxlength?: number;
    invalid?: boolean;
    describedBy?: string;
    autocomplete?: string;
  }>(),
  { type: "text", invalid: false },
);

const model = defineModel<string>({ default: "" });
</script>

<template>
  <input
    :id="id"
    v-model="model"
    :type="type"
    :name="name"
    :placeholder="placeholder"
    :maxlength="maxlength"
    :autocomplete="autocomplete"
    :aria-invalid="invalid || undefined"
    :aria-describedby="describedBy"
    class="min-h-11 w-full rounded-control border border-line bg-surface px-3 text-base text-ink transition-colors duration-200 ease-out-quart placeholder:text-muted"
  />
</template>
