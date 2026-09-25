<script setup lang="ts">
import type { PaymentConfigDto, TransactionDto } from "@checkout/contracts";
import CardBrandMark from "@/modules/checkout/presentation/components/CardBrandMark.vue";
import { useCardPayment } from "@/modules/checkout/presentation/composables/use-card-payment";
import { UiAlert, UiButton, UiField, UiInput } from "@/shared/ui";

const props = defineProps<{
  paymentConfig: PaymentConfigDto;
  resolveTransactionId: () => Promise<
    | { status: "ok"; transactionId: string }
    | { status: "error"; message: string }
  >;
}>();

const emit = defineEmits<{
  paid: [transaction: TransactionDto];
}>();

const {
  cardHolder,
  cardNumber,
  expMonth,
  expYear,
  cvc,
  installments,
  accepted,
  errors,
  loading,
  errorMessage,
  cardBrand,
  cvcMaxLength,
  onSubmit,
} = useCardPayment({
  resolveTransactionId: () => props.resolveTransactionId(),
  paymentConfig: () => props.paymentConfig,
  onPaid: (transaction) => emit("paid", transaction),
});
</script>

<template>
  <form class="grid gap-4" novalidate @submit="onSubmit">
    <UiField
      label="Cardholder name"
      :error="errors.cardHolder"
      v-slot="{ id, invalid }"
    >
      <UiInput
        :id="id"
        v-model="cardHolder"
        name="cardHolder"
        autocomplete="cc-name"
        :invalid="invalid"
      />
    </UiField>

    <UiField
      label="Card number"
      :error="errors.cardNumber"
      v-slot="{ id, invalid }"
    >
      <div class="relative overflow-visible">
        <UiInput
          :id="id"
          v-model="cardNumber"
          name="cardNumber"
          inputmode="numeric"
          autocomplete="cc-number"
          :maxlength="19"
          placeholder="4242 4242 4242 4242"
          class="pr-24"
          :invalid="invalid"
        />
        <div
          class="pointer-events-none absolute inset-y-0 right-3 z-10 flex items-center"
        >
          <CardBrandMark :brand="cardBrand" />
        </div>
      </div>
    </UiField>

    <div class="grid min-w-0 gap-1.5">
      <div class="grid grid-cols-3 gap-3">
        <UiField
          label="Month"
          :error="errors.expMonth"
          :show-message="false"
          v-slot="{ id, invalid }"
        >
          <UiInput
            :id="id"
            v-model="expMonth"
            name="expMonth"
            inputmode="numeric"
            autocomplete="cc-exp-month"
            :maxlength="2"
            placeholder="08"
            :invalid="invalid"
          />
        </UiField>
        <UiField
          label="Year"
          :error="errors.expYear"
          :show-message="false"
          v-slot="{ id, invalid }"
        >
          <UiInput
            :id="id"
            v-model="expYear"
            name="expYear"
            inputmode="numeric"
            autocomplete="cc-exp-year"
            :maxlength="2"
            placeholder="28"
            :invalid="invalid"
          />
        </UiField>
        <UiField
          label="CVC"
          :error="errors.cvc"
          :show-message="false"
          v-slot="{ id, invalid }"
        >
          <UiInput
            :id="id"
            v-model="cvc"
            name="cvc"
            inputmode="numeric"
            autocomplete="cc-csc"
            :maxlength="cvcMaxLength"
            :invalid="invalid"
          />
        </UiField>
      </div>
      <p
        class="min-h-5 text-sm leading-5"
        :class="
          errors.expMonth || errors.expYear || errors.cvc
            ? 'text-danger'
            : 'text-muted'
        "
      >
        {{
          errors.expMonth ||
          errors.expYear ||
          errors.cvc ||
          "\u00a0"
        }}
      </p>
    </div>

    <UiField
      label="Installments"
      :error="errors.installments"
      v-slot="{ id, invalid }"
    >
      <UiInput
        :id="id"
        v-model="installments"
        name="installments"
        inputmode="numeric"
        :maxlength="2"
        :invalid="invalid"
      />
    </UiField>

    <UiField label="Terms" :error="errors.accepted" v-slot="{ id, invalid }">
      <label
        :for="id"
        class="flex items-start gap-2 text-sm text-ink"
        :class="invalid ? 'text-danger' : undefined"
      >
        <input
          :id="id"
          v-model="accepted"
          type="checkbox"
          name="accepted"
          class="mt-1 size-4 rounded border-line"
          :aria-invalid="invalid || undefined"
        />
        <span>
          I accept Wompi's payment terms and personal data authorization.
        </span>
      </label>
    </UiField>

    <UiAlert v-if="errorMessage">{{ errorMessage }}</UiAlert>

    <UiButton type="submit" class="w-full" :loading="loading">
      Pay with card
    </UiButton>
  </form>
</template>
