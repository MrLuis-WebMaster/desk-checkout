import { computed, ref, watch } from "vue";
import { useForm } from "vee-validate";
import {
  TransactionStatus,
  type PaymentConfigDto,
  type TransactionDto,
} from "@checkout/contracts";
import {
  newIdempotencyKey,
  payTransaction,
  tokenizeWompiCard,
} from "@/modules/checkout/composition";
import {
  detectCardBrand,
  digitsOnly,
  expectedCvcLength,
  formatCardNumber,
} from "@/modules/checkout/infrastructure/card-number";
import { finalizeCheckout } from "@/modules/checkout/presentation/composables/finalize-checkout";
import { postChargeOutOfStockMessage } from "@/shared/application/messages/stock-messages";
import {
  cardPaymentSchema,
  type CardPaymentValues,
} from "@/modules/checkout/presentation/validation/card-payment.schema";

export function useCardPayment(options: {
  resolveTransactionId: () => Promise<
    | { status: "ok"; transactionId: string }
    | { status: "error"; message: string }
  >;
  paymentConfig: () => PaymentConfigDto;
  onPaid: (transaction: TransactionDto) => void;
}) {
  const { defineField, handleSubmit, errors, setFieldValue } = useForm<CardPaymentValues>({
    validationSchema: cardPaymentSchema,
    initialValues: {
      cardHolder: "",
      cardNumber: "",
      expMonth: "",
      expYear: "",
      cvc: "",
      installments: "1",
      accepted: false,
    },
  });

  const [cardHolder] = defineField("cardHolder");
  const [cardNumber] = defineField("cardNumber");
  const [expMonth] = defineField("expMonth");
  const [expYear] = defineField("expYear");
  const [cvc] = defineField("cvc");
  const [installments] = defineField("installments");
  const [accepted] = defineField("accepted");

  const loading = ref(false);
  const errorMessage = ref("");

  const cardBrand = computed(() => detectCardBrand(cardNumber.value ?? ""));
  const cvcMaxLength = computed(() => expectedCvcLength(cardBrand.value));

  watch(cardNumber, (value) => {
    const formatted = formatCardNumber(value ?? "");
    if (formatted !== value) {
      setFieldValue("cardNumber", formatted, false);
    }
  });

  watch(installments, (value) => {
    const digits = digitsOnly(String(value ?? "")).slice(0, 2);
    if (digits !== value) {
      setFieldValue("installments", digits || "", false);
    }
  });

  watch(expMonth, (value) => {
    const digits = digitsOnly(value ?? "").slice(0, 2);
    if (digits !== value) {
      setFieldValue("expMonth", digits, false);
    }
  });

  watch(expYear, (value) => {
    const digits = digitsOnly(value ?? "").slice(0, 2);
    if (digits !== value) {
      setFieldValue("expYear", digits, false);
    }
  });

  watch(cvc, (value) => {
    const digits = digitsOnly(value ?? "").slice(0, cvcMaxLength.value);
    if (digits !== value) {
      setFieldValue("cvc", digits, false);
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    errorMessage.value = "";
    loading.value = true;
    try {
      const resolved = await options.resolveTransactionId();
      if (resolved.status !== "ok") {
        errorMessage.value = resolved.message;
        return;
      }
      const transactionId = resolved.transactionId;

      const tokenized = await tokenizeWompiCard(
        options.paymentConfig().publicKey,
        {
          number: digitsOnly(values.cardNumber),
          cvc: digitsOnly(values.cvc),
          expMonth: values.expMonth,
          expYear: values.expYear,
          cardHolder: values.cardHolder,
        },
      );
      if (!tokenized.ok) {
        errorMessage.value = tokenized.message;
        return;
      }
      const paymentConfig = options.paymentConfig();
      const result = await payTransaction(
        transactionId,
        {
          paymentMethodToken: tokenized.token,
          acceptanceToken: paymentConfig.acceptanceToken,
          acceptPersonalAuth: paymentConfig.acceptPersonalAuth,
          installments: Number(values.installments) || 1,
        },
        newIdempotencyKey(),
      );
      if (result.status !== "ok") {
        if (result.status === "out_of_stock") {
          errorMessage.value = postChargeOutOfStockMessage(transactionId);
          return;
        }
        errorMessage.value =
          result.status === "not_found"
            ? "That order is no longer available."
            : "Payment failed. Check the card details or try another method.";
        return;
      }
      finalizeCheckout(result.value.status);
      if (result.value.status === TransactionStatus.Approved) {
        options.onPaid(result.value);
        return;
      }
      if (result.value.status === TransactionStatus.Declined) {
        errorMessage.value =
          "The bank declined this card. Try another card or payment method.";
        return;
      }
      errorMessage.value =
        "Payment could not be completed. Try again or use another method.";
    } finally {
      loading.value = false;
    }
  });

  return {
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
  };
}
