<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string;
    hint?: string;
    error?: string;
    /** When false, marks the control invalid but leaves message rendering to the parent. */
    showMessage?: boolean;
  }>(),
  { showMessage: true },
);

const fieldId = `field-${crypto.randomUUID()}`;

const describedBy = () => {
  if (props.error && props.showMessage) {
    return `${fieldId}-error`;
  }
  if (!props.error && props.hint && props.showMessage) {
    return `${fieldId}-hint`;
  }
  return undefined;
};
</script>

<template>
  <div class="grid min-w-0 gap-1.5">
    <label :for="fieldId" class="text-sm font-medium text-ink">
      {{ label }}
    </label>
    <slot
      :id="fieldId"
      :invalid="Boolean(error)"
      :described-by="describedBy()"
    />
    <p
      v-if="showMessage"
      :id="error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined"
      class="min-h-5 text-sm leading-5"
      :class="error ? 'text-danger' : 'text-muted'"
    >
      {{ error || hint || "\u00a0" }}
    </p>
  </div>
</template>
