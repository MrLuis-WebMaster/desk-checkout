<script setup lang="ts">
import { routeNames } from "@/app/router";
import { UiButton, UiEmpty } from "@/shared/ui";
</script>

<template>
  <main>
    <UiEmpty title="Page not found">
      This address does not match a product or a checkout.
      <template #action>
        <RouterLink :to="{ name: routeNames.productList }">
          <UiButton variant="secondary">Back to products</UiButton>
        </RouterLink>
      </template>
    </UiEmpty>
  </main>
</template>
