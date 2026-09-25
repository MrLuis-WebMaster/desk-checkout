<script setup lang="ts">
import { routeNames } from "@/app/router";
import CardPaymentForm from "@/modules/checkout/presentation/components/CardPaymentForm.vue";
import WompiWidgetPay from "@/modules/checkout/presentation/components/WompiWidgetPay.vue";
import { useCheckoutPage } from "@/modules/checkout/presentation/composables/use-checkout-page";
import { CHECKOUT_SCREEN_STEPS } from "@/modules/checkout/presentation/stores/checkout.store";
import { formatCop } from "@/shared/presentation/format-cop";
import {
  UiAlert,
  UiButton,
  UiField,
  UiInput,
  UiPrice,
  UiProductImage,
  UiSelect,
  UiSkeleton,
} from "@/shared/ui";

const {
  SHIPPING_CITY_CODES,
  SHIPPING_CITY_LABELS,
  step,
  hasCart,
  displayLines,
  fullName,
  email,
  phone,
  addressLine,
  city,
  shippingMethodId,
  errors,
  quotes,
  paymentConfig,
  transaction,
  formError,
  paymentError,
  quotesError,
  creating,
  loadingQuotes,
  loadingExtras,
  restoring,
  merchandiseTotal,
  displayBaseFee,
  displayDeliveryFee,
  orderTotal,
  widgetRedirectUrl,
  widgetCustomerEmail,
  widgetCustomerFullName,
  widgetCustomerPhone,
  resolveTransactionId,
  continueToPayment,
  editDetails,
  onCardPaid,
} = useCheckoutPage();
</script>

<template>
  <main class="mx-auto w-full max-w-3xl">
    <h1 class="text-2xl font-semibold tracking-tight">Checkout</h1>
    <ol class="mt-3 flex gap-4 text-sm" aria-label="Checkout steps">
      <li
        v-for="(item, index) in CHECKOUT_SCREEN_STEPS"
        :key="item.id"
        :aria-current="step === item.id ? 'step' : undefined"
        :class="step === item.id ? 'font-semibold text-ink' : 'text-muted'"
      >
        {{ index + 1 }}. {{ item.label }}
      </li>
    </ol>

    <div
      v-if="loadingExtras || restoring"
      class="mt-6 grid gap-3"
      aria-busy="true"
    >
      <span class="sr-only">Loading checkout</span>
      <UiSkeleton class="h-16 w-full" />
      <UiSkeleton class="h-11 w-full" />
    </div>

    <UiAlert v-else-if="!hasCart && !transaction" class="mt-6">
      Your cart is empty.
      <RouterLink
        :to="{ name: routeNames.productList }"
        class="mt-2 block font-medium text-ink underline"
      >
        Browse products
      </RouterLink>
    </UiAlert>

    <div
      v-else-if="hasCart || transaction"
      class="lg:grid lg:grid-cols-2 lg:items-start lg:gap-12"
    >
      <section class="mt-6 border-y border-line py-3 lg:mt-8">
        <ul class="grid gap-3">
          <li
            v-for="line in displayLines"
            :key="line.productId"
            class="flex gap-3"
          >
            <UiProductImage
              v-if="line.imageUrl"
              :src="line.imageUrl"
              :alt="line.name"
              width="64"
              height="64"
              class="size-16 rounded-control bg-sunken object-cover"
            />
            <div
              v-else
              class="size-16 shrink-0 rounded-control bg-sunken"
              aria-hidden="true"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">{{ line.name }}</p>
              <p class="mt-0.5 text-sm text-muted">Qty {{ line.quantity }}</p>
              <UiPrice :amount="line.price" size="md" class="mt-1" />
            </div>
          </li>
        </ul>
        <dl class="mt-4 grid gap-1 text-sm text-muted">
          <div class="flex justify-between gap-4">
            <dt>Subtotal</dt>
            <dd class="tabular-nums">
              {{ formatCop(merchandiseTotal) }}
            </dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt>Base fee</dt>
            <dd class="tabular-nums">
              {{ formatCop(displayBaseFee) }}
            </dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt>Shipping</dt>
            <dd class="tabular-nums">
              {{ formatCop(displayDeliveryFee) }}
            </dd>
          </div>
          <div class="flex justify-between gap-4 font-medium text-ink">
            <dt>Total</dt>
            <dd class="tabular-nums">{{ formatCop(orderTotal) }}</dd>
          </div>
        </dl>
      </section>

      <div class="lg:mt-8">
        <section v-if="step !== 'payment'" class="mt-6 lg:mt-0">
          <form class="grid gap-4" novalidate @submit="continueToPayment">
            <h2 class="text-sm font-medium">Customer & delivery</h2>

            <UiField
              label="Full name"
              :error="errors.fullName"
              v-slot="{ id, invalid }"
            >
              <UiInput
                :id="id"
                v-model="fullName"
                name="fullName"
                autocomplete="name"
                :invalid="invalid"
              />
            </UiField>
            <UiField
              label="Email"
              :error="errors.email"
              v-slot="{ id, invalid }"
            >
              <UiInput
                :id="id"
                v-model="email"
                type="email"
                name="email"
                autocomplete="email"
                :invalid="invalid"
              />
            </UiField>
            <UiField
              label="Phone"
              :error="errors.phone"
              v-slot="{ id, invalid }"
            >
              <UiInput
                :id="id"
                v-model="phone"
                name="phone"
                autocomplete="tel"
                inputmode="tel"
                :invalid="invalid"
              />
            </UiField>
            <UiField
              label="Address"
              :error="errors.addressLine"
              v-slot="{ id, invalid }"
            >
              <UiInput
                :id="id"
                v-model="addressLine"
                name="addressLine"
                autocomplete="street-address"
                :invalid="invalid"
              />
            </UiField>
            <UiField
              label="City"
              :error="errors.city"
              v-slot="{ id, invalid }"
            >
              <UiSelect
                :id="id"
                v-model="city"
                name="city"
                :invalid="invalid"
              >
                <option
                  v-for="code in SHIPPING_CITY_CODES"
                  :key="code"
                  :value="code"
                >
                  {{ SHIPPING_CITY_LABELS[code] }}
                </option>
              </UiSelect>
            </UiField>

            <UiField
              label="Shipping method"
              :hint="loadingQuotes ? 'Loading options…' : undefined"
              :error="errors.shippingMethodId || quotesError || undefined"
              v-slot="{ id, invalid }"
            >
              <UiSelect
                :id="id"
                v-model="shippingMethodId"
                name="shippingMethodId"
                :invalid="invalid || Boolean(quotesError)"
                :disabled="loadingQuotes || quotes.length === 0"
              >
                <option
                  v-for="quote in quotes"
                  :key="quote.id"
                  :value="quote.id"
                >
                  {{ quote.name }} — {{ formatCop(quote.amount) }}
                </option>
              </UiSelect>
            </UiField>

            <UiAlert v-if="formError">{{ formError }}</UiAlert>

            <UiButton
              type="submit"
              class="w-full"
              :loading="creating"
              :disabled="!paymentConfig"
            >
              Continue to payment
            </UiButton>
          </form>
        </section>

        <section v-else class="mt-6 grid gap-8 lg:mt-0">
          <div>
            <h2 class="text-sm font-medium">Pay with card</h2>
            <div class="mt-3">
              <CardPaymentForm
                v-if="paymentConfig"
                :payment-config="paymentConfig"
                :resolve-transaction-id="resolveTransactionId"
                @paid="onCardPaid"
              />
            </div>
            <UiAlert v-if="paymentError" class="mt-3">{{ paymentError }}</UiAlert>
            <UiButton
              type="button"
              variant="secondary"
              class="mt-4 w-full"
              @click="editDetails"
            >
              Edit details
            </UiButton>
          </div>

          <div class="border-t border-line pt-6">
            <h2 class="text-sm font-medium">Other methods</h2>
            <div class="mt-3">
              <WompiWidgetPay
                :resolve-transaction-id="resolveTransactionId"
                :redirect-url="widgetRedirectUrl"
                :customer-email="widgetCustomerEmail"
                :customer-full-name="widgetCustomerFullName"
                :customer-phone="widgetCustomerPhone"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  </main>
</template>
