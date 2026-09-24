<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute } from "vue-router";
import { useCheckoutStore } from "../../../stores/checkout";

const route = useRoute();
const checkout = useCheckoutStore();

onMounted(() => {
  const productId = route.params.id;
  if (typeof productId === "string") {
    checkout.openProduct(productId);
  }
});
</script>

<template>
  <main>
    <h1>Product</h1>
    <p>{{ checkout.productId }}</p>
  </main>
</template>
