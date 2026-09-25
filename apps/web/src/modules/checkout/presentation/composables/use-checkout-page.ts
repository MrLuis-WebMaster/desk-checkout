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
import { CREATE_OUT_OF_STOCK_MESSAGE } from "@/shared/application/messages/stock-messages";
import { useCartStore } from "@/modules/checkout/presentation/stores/cart.store";
import {
  SHIPPING_CITY_CODES,
  SHIPPING_CITY_LABELS,
} from "@/modules/checkout/presentation/shipping-cities";
import {
  customerDeliverySchema,
  type CustomerDeliveryValues,
} from "@/modules/checkout/presentation/validation/customer-delivery.schema";
import { createSharedCreate } from "@/modules/checkout/presentation/ensure-pending-transaction";
import type { ScreenResult } from "@/shared/application/results/screen-result";

function linesFingerprint(
  lines: ReadonlyArray<{ productId: string; quantity: number }>,
): string {
  return lines
    .map((line) => `${line.productId}:${line.quantity}`)
    .sort()
    .join("|");
}

export type ResolveTransactionIdResult =
  | { status: "ok"; transactionId: string }
  | { status: "error"; message: string };

export function useCheckoutPage() {
  const {
    step,
    startPayment,
    beginCheckout,
    rememberPending,
    clearPending,
    saveDraft,
    clearDraft,
    pendingTransactionId,
    pendingCartFingerprint,
    draft,
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
  const paymentError = ref("");
  const quotesError = ref("");
  const continuing = ref(false);
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

  const displayBaseFee = computed(
    () => transaction.value?.baseFee ?? baseFee.value,
  );

  const displayDeliveryFee = computed(
    () => transaction.value?.deliveryFee ?? selectedQuote.value?.amount ?? 0,
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
      baseFee: displayBaseFee.value,
      deliveryFee: displayDeliveryFee.value,
    });
  });

  const widgetCustomerEmail = computed(
    () => transaction.value?.customer.email ?? email.value ?? draft.value?.email,
  );
  const widgetCustomerFullName = computed(
    () =>
      transaction.value?.customer.fullName ??
      fullName.value ??
      draft.value?.fullName,
  );
  const widgetCustomerPhone = computed(
    () => transaction.value?.customer.phone ?? phone.value ?? draft.value?.phone,
  );

  function widgetRedirectUrl(transactionId: string): string {
    if (typeof window === "undefined") {
      return "";
    }
    return `${window.location.origin}/checkout/result/${transactionId}`;
  }

  function invalidatePendingOrder() {
    transaction.value = null;
    clearPending();
  }

  function hydrateFormFromDraft(values: CustomerDeliveryValues) {
    setFieldValue("fullName", values.fullName);
    setFieldValue("email", values.email);
    setFieldValue("phone", values.phone);
    setFieldValue("addressLine", values.addressLine);
    setFieldValue("city", values.city);
    setFieldValue("shippingMethodId", values.shippingMethodId);
  }

  function hydrateFormFromTransaction(order: TransactionDto) {
    setFieldValue("fullName", order.customer.fullName);
    setFieldValue("email", order.customer.email);
    setFieldValue("phone", order.customer.phone);
    setFieldValue("addressLine", order.delivery.addressLine);
    setFieldValue("city", order.delivery.city);
    setFieldValue("shippingMethodId", order.delivery.shippingMethodId);
  }

  function createErrorMessage(result: Exclude<ScreenResult<TransactionDto>, { status: "ok" }>) {
    if (result.status === "out_of_stock") {
      return CREATE_OUT_OF_STOCK_MESSAGE;
    }
    if (result.status === "not_found") {
      return "That product is no longer available.";
    }
    return "Couldn't create the order. Check the form and try again.";
  }

  const pendingCreate = createSharedCreate<ScreenResult<TransactionDto>>({
    getExisting: () =>
      transaction.value
        ? { status: "ok" as const, value: transaction.value }
        : null,
    create: async () => {
      const draftValues = draft.value;
      const customer = {
        fullName: (fullName.value || draftValues?.fullName || "").trim(),
        email: (email.value || draftValues?.email || "").trim(),
        phone: (phone.value || draftValues?.phone || "").trim(),
      };
      const delivery = {
        shippingMethodId:
          (shippingMethodId.value || draftValues?.shippingMethodId || "").trim(),
        addressLine: (addressLine.value || draftValues?.addressLine || "").trim(),
        city: (city.value || draftValues?.city || "BOG") as ShippingCityCode,
      };
      const result = await createTransaction({
        items: cartLines.value.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
        })),
        customer,
        delivery,
      });
      if (result.status === "ok") {
        transaction.value = result.value;
        rememberPending(result.value.id, cartFingerprint.value);
      }
      return result;
    },
  });

  async function resolveTransactionId(): Promise<ResolveTransactionIdResult> {
    paymentError.value = "";
    if (cartLines.value.length === 0) {
      return { status: "error", message: "Your cart is empty." };
    }
    if (!paymentConfig.value) {
      return {
        status: "error",
        message: "Payment is temporarily unavailable.",
      };
    }
    try {
      const result = await pendingCreate.ensure();
      if (result.status !== "ok") {
        const message = createErrorMessage(result);
        paymentError.value = message;
        return { status: "error", message };
      }
      return { status: "ok", transactionId: result.value.id };
    } catch {
      const message = "Couldn't create the order. Check the form and try again.";
      paymentError.value = message;
      return { status: "error", message };
    }
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
      return false;
    }
    if (
      cartLines.value.length === 0 ||
      pendingFingerprint !== cartFingerprint.value
    ) {
      invalidatePendingOrder();
      return false;
    }

    restoring.value = true;
    try {
      const result = await getTransaction(pendingId);
      if (result.status !== "ok") {
        invalidatePendingOrder();
        return false;
      }
      const order = result.value;
      if (order.status !== TransactionStatus.Pending) {
        invalidatePendingOrder();
        return false;
      }
      if (linesFingerprint(order.lines) !== cartFingerprint.value) {
        invalidatePendingOrder();
        return false;
      }

      hydrateFormFromTransaction(order);
      saveDraft({
        fullName: order.customer.fullName,
        email: order.customer.email,
        phone: order.customer.phone,
        addressLine: order.delivery.addressLine,
        city: order.delivery.city as ShippingCityCode,
        shippingMethodId: order.delivery.shippingMethodId,
      });
      await loadQuotes(
        order.delivery.city as ShippingCityCode,
        order.delivery.shippingMethodId,
      );
      transaction.value = order;
      rememberPending(order.id, cartFingerprint.value);
      return true;
    } catch {
      invalidatePendingOrder();
      return false;
    } finally {
      restoring.value = false;
    }
  }

  const continueToPayment = handleSubmit(async (formValues) => {
    formError.value = "";
    paymentError.value = "";
    if (cartLines.value.length === 0) {
      formError.value = "Your cart is empty.";
      return;
    }
    if (!paymentConfig.value) {
      formError.value = "Payment is temporarily unavailable.";
      return;
    }

    continuing.value = true;
    try {
      saveDraft({
        fullName: formValues.fullName,
        email: formValues.email,
        phone: formValues.phone,
        addressLine: formValues.addressLine,
        city: formValues.city,
        shippingMethodId: formValues.shippingMethodId,
      });
      startPayment();
    } finally {
      continuing.value = false;
    }
  });

  /**
   * Return to Details with the cart intact. Clears the client pending pointer
   * only; the server may still keep a PENDING row (orphan until expiry /
   * webhooks in Phase 6). No cancel-pending API yet.
   */
  function editDetails() {
    invalidatePendingOrder();
    paymentError.value = "";
  }

  function onCardPaid(paid: TransactionDto) {
    const transactionId = paid.id;
    transaction.value = null;
    void router.push({
      name: routeNames.checkoutResult,
      params: { transactionId },
    });
  }

  watch(city, (shippingCity) => {
    if (!shippingCity || step.value === "payment") {
      return;
    }
    void loadQuotes(shippingCity as ShippingCityCode);
  });

  watch(
    cartFingerprint,
    (fingerprint, previous) => {
      if (previous !== undefined && fingerprint !== previous) {
        invalidatePendingOrder();
        clearDraft();
      }
      if (cartLines.value.length === 0) {
        invalidatePendingOrder();
        clearDraft();
      }
    },
  );

  onMounted(() => {
    void (async () => {
      await loadExtras();

      if (draft.value) {
        hydrateFormFromDraft(draft.value);
      }

      const restored = await restorePendingOrder();
      if (restored) {
        return;
      }

      if (draft.value && step.value === "payment" && hasCart.value) {
        await loadQuotes(
          (draft.value.city as ShippingCityCode) || "BOG",
          draft.value.shippingMethodId,
        );
        startPayment();
        return;
      }

      beginCheckout();
      void loadQuotes((city.value as ShippingCityCode) || "BOG");
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
    paymentError,
    quotesError,
    continuing,
    creating: continuing,
    loadingQuotes,
    loadingExtras,
    restoring,
    merchandiseTotal,
    displayBaseFee,
    displayDeliveryFee,
    selectedQuote,
    orderTotal,
    widgetRedirectUrl,
    widgetCustomerEmail,
    widgetCustomerFullName,
    widgetCustomerPhone,
    resolveTransactionId,
    continueToPayment,
    editDetails,
    onCardPaid,
  };
}
