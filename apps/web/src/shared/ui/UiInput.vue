<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    id?: string;
    type?: string;
    name?: string;
    placeholder?: string;
    maxlength?: number | string;
    invalid?: boolean;
    describedBy?: string;
    autocomplete?: string;
    inputmode?:
      | "none"
      | "text"
      | "decimal"
      | "numeric"
      | "tel"
      | "search"
      | "email"
      | "url";
  }>(),
  { type: "text", invalid: false },
);

const model = defineModel<string>({ default: "" });

const maxLengthAttr = computed(() => {
  if (props.maxlength == null || props.maxlength === "") {
    return undefined;
  }
  const value = Number(props.maxlength);
  return Number.isFinite(value) ? value : undefined;
});
</script>

<template>
  <input
    :id="id"
    v-model="model"
    :type="type"
    :name="name"
    :placeholder="placeholder"
    :maxlength="maxLengthAttr"
    :autocomplete="autocomplete"
    :inputmode="inputmode"
    :aria-invalid="invalid || undefined"
    :aria-describedby="describedBy"
    class="min-h-11 w-full rounded-control border bg-surface px-3 text-base text-ink transition-colors duration-200 ease-out-quart placeholder:text-muted"
    :class="
      invalid
        ? 'border-danger focus:outline-danger'
        : 'border-line'
    "
  />
</template>
