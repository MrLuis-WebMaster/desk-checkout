<script setup lang="ts">
import { watch } from "vue";
import { useRoute } from "vue-router";
import { routeNames } from "@/app/router";
import { useCheckoutStore } from "@/stores/checkout";

const route = useRoute(routeNames.product);
const checkout = useCheckoutStore();

watch(
  () => route.params.id,
  (productId) => {
    checkout.openProduct(productId);
  },
  { immediate: true },
);
</script>

<template>
  <main>
    <h1>Product</h1>
    <p>{{ checkout.productId }}</p>
  </main>
</template>
