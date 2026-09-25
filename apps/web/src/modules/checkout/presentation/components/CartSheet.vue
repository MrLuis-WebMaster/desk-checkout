<script setup lang="ts">
import { nextTick, onScopeDispose, useTemplateRef, watch } from "vue";
import { useRouter } from "vue-router";
import { Minus, Plus, Trash2, X } from "@lucide/vue";
import { routeNames } from "@/app/router";
import { useCartStore } from "@/modules/checkout/presentation/stores/cart.store";
import { UiButton, UiIconButton, UiPrice, UiProductImage } from "@/shared/ui";

const cart = useCartStore();
const router = useRouter();
const closeButton = useTemplateRef<{ focus: () => void }>("closeButton");

function continueToCheckout() {
  if (cart.lines.length === 0) {
    return;
  }
  cart.close();
  void router.push({ name: routeNames.checkout });
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && cart.isOpen) {
    cart.close();
  }
}

watch(
  () => cart.isOpen,
  async (open) => {
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) {
      return;
    }
    await nextTick();
    closeButton.value?.focus();
  },
);

window.addEventListener("keydown", onKeydown);
onScopeDispose(() => {
  window.removeEventListener("keydown", onKeydown);
  document.body.style.overflow = "";
});
</script>

<template>
  <Teleport to="body">
    <div v-if="cart.isOpen" class="fixed inset-0 z-40">
      <button
        type="button"
        class="absolute inset-0 bg-ink/30"
        aria-label="Close cart"
        @click="cart.close()"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        class="animate-sheet-in absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-paper shadow-[0_0_0_1px_var(--color-line)]"
      >
        <header class="flex h-14 items-center justify-between border-b border-line px-4">
          <h2 id="cart-title" class="text-base font-semibold tracking-tight">
            Cart
          </h2>
          <UiIconButton
            ref="closeButton"
            :icon="X"
            label="Close cart"
            @click="cart.close()"
          />
        </header>

        <div class="flex-1 overflow-y-auto px-4">
          <p v-if="cart.lines.length === 0" class="py-8 text-sm text-muted">
            Your cart is empty.
            <RouterLink
              :to="{ name: routeNames.productList }"
              class="mt-3 block font-medium text-ink hover:underline"
              @click="cart.close()"
            >
              Browse products
            </RouterLink>
          </p>

          <ul v-else class="divide-y divide-line">
            <li
              v-for="line in cart.lines"
              :key="line.productId"
              class="flex gap-3 py-4"
            >
              <UiProductImage
                :src="line.imageUrl"
                :alt="line.name"
                width="72"
                height="72"
                class="size-18 rounded-control bg-sunken object-cover"
              />
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium">{{ line.name }}</p>
                <UiPrice :amount="line.price" size="md" class="mt-0.5" />
                <div class="mt-2 flex items-center gap-2">
                  <UiIconButton
                    :icon="Minus"
                    :size="16"
                    variant="outline"
                    :label="`Decrease ${line.name}`"
                    :disabled="line.quantity <= 1"
                    @click="cart.setQuantity(line.productId, line.quantity - 1)"
                  />
                  <span class="w-8 text-center tabular-nums">{{ line.quantity }}</span>
                  <UiIconButton
                    :icon="Plus"
                    :size="16"
                    variant="outline"
                    :label="`Increase ${line.name}`"
                    :disabled="line.quantity >= line.availableStock"
                    @click="cart.setQuantity(line.productId, line.quantity + 1)"
                  />
                  <UiIconButton
                    :icon="Trash2"
                    :size="16"
                    variant="quiet"
                    :label="`Remove ${line.name}`"
                    @click="cart.remove(line.productId)"
                  />
                </div>
              </div>
            </li>
          </ul>
        </div>

        <footer v-if="cart.lines.length > 0" class="border-t border-line px-4 py-4">
          <div class="flex items-baseline justify-between gap-4">
            <p class="text-sm text-muted">Subtotal</p>
            <UiPrice :amount="cart.subtotal" />
          </div>
          <UiButton class="mt-4 w-full" @click="continueToCheckout">
            Continue to checkout
          </UiButton>
        </footer>
      </aside>
    </div>
  </Teleport>
</template>
