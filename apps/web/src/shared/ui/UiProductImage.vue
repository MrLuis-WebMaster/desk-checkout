<script setup lang="ts">
import { ref, watch } from "vue";
import {
  productImageFallback,
  productImageSrc,
} from "@/shared/presentation/product-image";

const props = defineProps<{
  src: string;
  alt: string;
}>();

const currentSrc = ref(productImageSrc(props.src));

watch(
  () => props.src,
  (src) => {
    currentSrc.value = productImageSrc(src);
  },
);

function onError() {
  const fallback = productImageFallback(props.src);
  if (currentSrc.value === fallback) {
    return;
  }
  currentSrc.value = fallback;
}
</script>

<template>
  <img :src="currentSrc" :alt="alt" @error="onError" />
</template>
