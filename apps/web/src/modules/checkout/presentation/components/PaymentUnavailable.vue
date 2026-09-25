<script setup lang="ts">
defineProps<{
  message: string;
}>();
</script>

<template>
  <p class="mt-2 max-w-[65ch] text-sm text-muted">{{ message }}</p>
</template>
