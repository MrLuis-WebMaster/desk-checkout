<script setup lang="ts">
import { routeNames } from "@/app/router";
</script>

<template>
  <div class="min-h-dvh bg-paper text-ink">
    <header class="sticky top-0 z-10 border-b border-line bg-paper">
      <div class="mx-auto flex h-14 max-w-lg items-center px-4">
        <RouterLink
          :to="{ name: routeNames.productList }"
          class="text-base font-semibold tracking-tight"
        >
          Checkout
        </RouterLink>
      </div>
    </header>
    <div class="mx-auto w-full max-w-lg px-4 pb-8 pt-5">
      <slot />
    </div>
  </div>
</template>
