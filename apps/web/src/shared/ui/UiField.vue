<script setup lang="ts">
defineProps<{
  label: string;
  hint?: string;
  error?: string;
}>();

const fieldId = `field-${crypto.randomUUID()}`;
</script>

<template>
  <div class="grid gap-1.5">
    <label :for="fieldId" class="text-sm font-medium text-ink">
      {{ label }}
    </label>
    <slot :id="fieldId" :invalid="Boolean(error)" />
    <p v-if="error" :id="`${fieldId}-error`" class="text-sm text-danger">
      {{ error }}
    </p>
    <p v-else-if="hint" :id="`${fieldId}-hint`" class="text-sm text-muted">
      {{ hint }}
    </p>
  </div>
</template>
