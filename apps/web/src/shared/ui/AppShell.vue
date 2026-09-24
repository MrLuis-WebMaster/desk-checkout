<script setup lang="ts">
import { ShoppingBag } from "@lucide/vue";
import { routeNames } from "@/app/router";
import CartSheet from "@/modules/checkout/presentation/components/CartSheet.vue";
import { useCartStore } from "@/modules/checkout/presentation/stores/cart.store";
import UiIconButton from "@/shared/ui/UiIconButton.vue";

const cart = useCartStore();
</script>

<template>
  <div class="min-h-dvh bg-paper text-ink">
    <header class="sticky top-0 z-10 border-b border-line bg-paper">
      <div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <RouterLink
          :to="{ name: routeNames.productList }"
          class="text-base font-semibold tracking-tight"
        >
          Ecommerce
        </RouterLink>
        <UiIconButton
          class="relative"
          :icon="ShoppingBag"
          :label="`Cart, ${cart.count} items`"
          :aria-expanded="cart.isOpen"
          @click="cart.isOpen ? cart.close() : cart.open()"
        >
          <span
            v-if="cart.count > 0"
            class="absolute top-1 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold tabular-nums leading-none text-on-accent"
          >
            {{ cart.count > 99 ? "99+" : cart.count }}
          </span>
        </UiIconButton>
      </div>
    </header>
    <div class="mx-auto w-full max-w-6xl px-4 pt-5 pb-8 sm:px-6 sm:pt-8 sm:pb-12">
      <slot />
    </div>
    <CartSheet />
  </div>
</template>
