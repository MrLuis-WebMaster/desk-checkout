import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useForm } from "vee-validate";
import {
  computeMerchandiseTotal,
  computeOrderTotal,
  TransactionStatus,
  type PaymentConfigDto,
  type ShippingCityCode,
  type ShippingMethodQuoteDto,
  type TransactionDto,
} from "@checkout/contracts";
import { routeNames } from "@/app/router";
import {
  createTransaction,
  getCheckoutSettings,
  getPaymentConfig,
  getTransaction,
  listShippingQuotes,
} from "@/modules/checkout/composition";
import { useCheckout } from "@/modules/checkout/presentation/composables/use-checkout";
import { useCartStore } from "@/modules/checkout/presentation/stores/cart.store";
import {
  SHIPPING_CITY_CODES,
  SHIPPING_CITY_LABELS,
} from "@/modules/checkout/presentation/shipping-cities";
import {
  customerDeliverySchema,
  type CustomerDeliveryValues,
} from "@/modules/checkout/presentation/validation/customer-delivery.schema";

function linesFingerprint(
  lines: ReadonlyArray<{ productId: string; quantity: number }>,
): string {
  return lines
    .map((line) => `${line.productId}:${line.quantity}`)
    .sort()
    .join("|");
}

export function useCheckoutPage() {
  const {
    step,
    startPayment,
    beginCheckout,
    rememberPending,
    clearPending,
    pendingTransactionId,
    pendingCartFingerprint,
  } = useCheckout();
  const cart = useCartStore();
  const router = useRouter();

  const cartLines = computed(() => cart.lines);
  const hasCart = computed(() => cartLines.value.length > 0);

  const { defineField, handleSubmit, errors, setFieldValue } = useForm({
    validationSchema: customerDeliverySchema,
    initialValues: {
      fullName: "",
      email: "",
      phone: "",
      addressLine: "",
      city: "BOG",
      shippingMethodId: "",
    } satisfies CustomerDeliveryValues,
  });

  const [fullName] = defineField("fullName");
  const [email] = defineField("email");
  const [phone] = defineField("phone");
  const [addressLine] = defineField("addressLine");
  const [city] = defineField("city");
  const [shippingMethodId] = defineField("shippingMethodId");

  const quotes = ref<ShippingMethodQuoteDto[]>([]);
  const baseFee = ref(0);
  const paymentConfig = ref<PaymentConfigDto | null>(null);
  const transaction = ref<TransactionDto | null>(null);

  const formError = ref("");
  const quotesError = ref("");
  const creating = ref(false);
  const loadingQuotes = ref(false);
  const loadingExtras = ref(true);
  const restoring = ref(false);

  const cartFingerprint = computed(() => linesFingerprint(cartLines.value));

  const displayLines = computed(() =>
    cartLines.value.map((line) => ({
      productId: line.productId,
      name: line.name,
      price: line.price,
      quantity: line.quantity,
      imageUrl: line.imageUrl,
    })),
  );

  const merchandiseTotal = computed(() =>
    computeMerchandiseTotal(
      displayLines.value.map((line) => ({
        unitPrice: line.price,
        quantity: line.quantity,
      })),
    ),
  );

  const selectedQuote = computed(() =>
    quotes.value.find((quote) => quote.id === shippingMethodId.value),
  );

  const orderTotal = computed(() => {
    if (displayLines.value.length === 0) {
      return 0;
    }
    return computeOrderTotal({
      lines: displayLines.value.map((line) => ({
        unitPrice: line.price,
        quantity: line.quantity,
      })),
      baseFee: transaction.value?.baseFee ?? baseFee.value,
      deliveryFee:
        transaction.value?.deliveryFee ?? selectedQuote.value?.amount ?? 0,
    });
  });

  const widgetRedirectUrl = computed(() => {
    if (!transaction.value || typeof window === "undefined") {
      return "";
    }
    return `${window.location.origin}/checkout/result/${transaction.value.id}`;
  });

  function invalidatePendingOrder() {
    transaction.value = null;
    clearPending();
  }

  function hydrateFormFromTransaction(order: TransactionDto) {
    setFieldValue("fullName", order.customer.fullName);
    setFieldValue("email", order.customer.email);
    setFieldValue("phone", order.customer.phone);
    setFieldValue("addressLine", order.delivery.addressLine);
    setFieldValue("city", order.delivery.city);
    setFieldValue("shippingMethodId", order.delivery.shippingMethodId);
  }

  async function loadExtras() {
    loadingExtras.value = true;
    const [settings, config] = await Promise.all([
      getCheckoutSettings(),
      getPaymentConfig(),
    ]);
    if (settings.status === "ok") {
      baseFee.value = settings.value.baseFee;
    }
    if (config.status === "ok") {
      paymentConfig.value = config.value;
    } else {
      formError.value =
        "Payment is temporarily unavailable. Refresh and try again.";
    }
    loadingExtras.value = false;
  }

  async function loadQuotes(
    shippingCity: ShippingCityCode,
    preferredMethodId?: string,
  ) {
    loadingQuotes.value = true;
    quotesError.value = "";
    const result = await listShippingQuotes(shippingCity);
    if (result.status !== "ok") {
      quotes.value = [];
      setFieldValue("shippingMethodId", "");
      quotesError.value = "Couldn't load shipping options for that city.";
      loadingQuotes.value = false;
      return;
    }
    quotes.value = result.value;
    const preferred =
      preferredMethodId &&
      result.value.some((quote) => quote.id === preferredMethodId)
        ? preferredMethodId
        : (result.value[0]?.id ?? "");
    setFieldValue("shippingMethodId", preferred);
    loadingQuotes.value = false;
  }

  async function restorePendingOrder() {
    const pendingId = pendingTransactionId.value;
    const pendingFingerprint = pendingCartFingerprint.value;
    if (!pendingId || !pendingFingerprint) {
      beginCheckout();
      return;
    }
    if (
      cartLines.value.length === 0 ||
      pendingFingerprint !== cartFingerprint.value
    ) {
      invalidatePendingOrder();
      return;
    }

    restoring.value = true;
    try {
      const result = await getTransaction(pendingId);
      if (result.status !== "ok") {
        invalidatePendingOrder();
        return;
      }
      const order = result.value;
      if (order.status !== TransactionStatus.Pending) {
        invalidatePendingOrder();
        return;
      }
      if (linesFingerprint(order.lines) !== cartFingerprint.value) {
        invalidatePendingOrder();
        return;
      }

      hydrateFormFromTransaction(order);
      await loadQuotes(
        order.delivery.city as ShippingCityCode,
        order.delivery.shippingMethodId,
      );
      transaction.value = order;
      rememberPending(order.id, cartFingerprint.value);
    } catch {
      invalidatePendingOrder();
    } finally {
      restoring.value = false;
    }
  }

  const continueToPayment = handleSubmit(async (values) => {
    formError.value = "";
    if (cartLines.value.length === 0) {
      formError.value = "Your cart is empty.";
      return;
    }
    if (!paymentConfig.value) {
      formError.value = "Payment is temporarily unavailable.";
      return;
    }

    creating.value = true;
    try {
      const result = await createTransaction({
        items: cartLines.value.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
        })),
        customer: {
          fullName: values.fullName,
          email: values.email,
          phone: values.phone,
        },
        delivery: {
          shippingMethodId: values.shippingMethodId,
          addressLine: values.addressLine,
          city: values.city,
        },
      });
      if (result.status !== "ok") {
        formError.value =
          result.status === "not_found"
            ? "That product is no longer available."
            : "Couldn't create the order. Check the form and try again.";
        return;
      }
      transaction.value = result.value;
      rememberPending(result.value.id, cartFingerprint.value);
    } finally {
      creating.value = false;
    }
  });

  function onCardPaid(paid: TransactionDto) {
    const transactionId = paid.id;
    transaction.value = null;
    void router.push({
      name: routeNames.checkoutResult,
      params: { transactionId },
    });
  }

  watch(city, (shippingCity) => {
    if (!shippingCity || transaction.value) {
      return;
    }
    void loadQuotes(shippingCity as ShippingCityCode);
  });

  watch(
    cartFingerprint,
    (fingerprint, previous) => {
      if (previous !== undefined && fingerprint !== previous) {
        invalidatePendingOrder();
      }
      if (cartLines.value.length === 0) {
        invalidatePendingOrder();
      }
    },
  );

  // Step label must match the live order on this page, not a stale store flag.
  watch(
    transaction,
    (order) => {
      if (order) {
        startPayment();
      } else {
        beginCheckout();
      }
    },
    { immediate: true },
  );

  onMounted(() => {
    beginCheckout();
    void (async () => {
      await loadExtras();
      await restorePendingOrder();
      if (!transaction.value) {
        void loadQuotes((city.value as ShippingCityCode) || "BOG");
      }
    })();
  });

  return {
    SHIPPING_CITY_CODES,
    SHIPPING_CITY_LABELS,
    step,
    hasCart,
    cartLines,
    displayLines,
    fullName,
    email,
    phone,
    addressLine,
    city,
    shippingMethodId,
    errors,
    quotes,
    baseFee,
    paymentConfig,
    transaction,
    formError,
    quotesError,
    creating,
    loadingQuotes,
    loadingExtras,
    restoring,
    merchandiseTotal,
    selectedQuote,
    orderTotal,
    widgetRedirectUrl,
    continueToPayment,
    onCardPaid,
  };
}
