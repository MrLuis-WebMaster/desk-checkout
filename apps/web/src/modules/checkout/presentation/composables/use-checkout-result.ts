import { computed, onMounted, ref, type Component } from "vue";
import { useRoute, useRouter } from "vue-router";
import { CircleAlert, CircleCheck, CircleX, Clock } from "@lucide/vue";
import {
  computeMerchandiseTotal,
  DeliveryStatus,
  TransactionStatus,
  type ShippingCityCode,
  type TransactionDto,
  type TransactionLineDto,
} from "@checkout/contracts";
import { SHIPPING_CITY_LABELS } from "@/modules/checkout/presentation/shipping-cities";
import { routeNames } from "@/app/router";
import {
  getTransaction,
  newIdempotencyKey,
  syncProviderPayment,
} from "@/modules/checkout/composition";
import { finalizeCheckout } from "@/modules/checkout/presentation/composables/finalize-checkout";
import { purchasedProductsCta } from "@/modules/checkout/presentation/purchased-products-cta";
import { postChargeOutOfStockMessage } from "@/shared/application/messages/stock-messages";

type ResultTone = "ok" | "danger" | "wait";

export type CheckoutResultView = {
  tone: ResultTone;
  icon: Component;
  title: string;
  detail: string;
  primaryLabel: string;
  primaryAction: () => void;
  secondaryLabel?: string;
  secondaryAction?: () => void;
};

export function useCheckoutResult() {
  const route = useRoute();
  const router = useRouter();

  const loading = ref(true);
  const errorMessage = ref("");
  const status = ref<TransactionStatus | null>(null);
  const deliveryStatus = ref<DeliveryStatus | null>(null);
  const lines = ref<TransactionLineDto[]>([]);
  const baseFee = ref(0);
  const deliveryFee = ref(0);
  const shippingCity = ref<ShippingCityCode | null>(null);
  const total = ref(0);

  function applyTransaction(value: TransactionDto) {
    status.value = value.status;
    deliveryStatus.value = value.delivery.status ?? null;
    lines.value =
      value.lines.length > 0
        ? value.lines
        : [
            {
              productId: value.productId,
              productName: value.productName,
              productPrice: value.productPrice,
              quantity: value.quantity,
            },
          ];
    baseFee.value = value.baseFee;
    deliveryFee.value = value.deliveryFee;
    shippingCity.value = value.delivery.city;
    total.value = value.total;
    finalizeCheckout(value.status);
  }

  function goCatalog() {
    void router.push({ name: routeNames.productList });
  }

  function goCheckout() {
    void router.push({ name: routeNames.checkout });
  }

  function refreshResult() {
    window.location.reload();
  }

  onMounted(async () => {
    const params = route.params as Record<string, string | string[] | undefined>;
    const param = params.transactionId;
    const transactionId =
      typeof param === "string"
        ? param
        : Array.isArray(param)
          ? (param[0] ?? "")
          : "";
    const providerId =
      typeof route.query.id === "string" ? route.query.id.trim() : "";

    if (!transactionId) {
      errorMessage.value = "Missing order reference.";
      loading.value = false;
      return;
    }

    try {
      if (providerId) {
        const synced = await syncProviderPayment(
          transactionId,
          { providerTransactionId: providerId },
          newIdempotencyKey(),
        );
        if (synced.status === "ok") {
          applyTransaction(synced.value);
          return;
        }
        if (synced.status === "not_found") {
          errorMessage.value = "We couldn't find that order.";
          return;
        }
        if (synced.status === "out_of_stock") {
          errorMessage.value = postChargeOutOfStockMessage(transactionId);
          return;
        }
        errorMessage.value =
          "We couldn't confirm the payment yet. Refresh in a moment.";
        return;
      }

      const current = await getTransaction(transactionId);
      if (current.status !== "ok") {
        errorMessage.value =
          current.status === "not_found"
            ? "We couldn't find that order."
            : "Couldn't load the order status. Try again.";
        return;
      }
      applyTransaction(current.value);
    } finally {
      loading.value = false;
    }
  });

  const view = computed<CheckoutResultView | null>(() => {
    if (!status.value) return null;

    switch (status.value) {
      case TransactionStatus.Approved:
        return {
          tone: "ok",
          icon: CircleCheck,
          title: "Payment approved",
          detail: "Your order is confirmed. No further action is needed.",
          primaryLabel: "Continue shopping",
          primaryAction: goCatalog,
        };
      case TransactionStatus.Declined:
        return {
          tone: "danger",
          icon: CircleX,
          title: "Payment declined",
          detail:
            "The bank did not authorize this charge. Your cart is still here if you want to try again.",
          primaryLabel: "Try payment again",
          primaryAction: goCheckout,
          secondaryLabel: "Back to catalog",
          secondaryAction: goCatalog,
        };
      case TransactionStatus.Error:
        return {
          tone: "danger",
          icon: CircleAlert,
          title: "Payment failed",
          detail:
            "Something went wrong while charging. Try again, or pick another method at checkout.",
          primaryLabel: "Return to checkout",
          primaryAction: goCheckout,
          secondaryLabel: "Back to catalog",
          secondaryAction: goCatalog,
        };
      case TransactionStatus.Pending:
        return {
          tone: "wait",
          icon: Clock,
          title: "Payment pending",
          detail:
            "Wompi is still confirming this charge. Refresh in a moment, or wait for an update.",
          primaryLabel: "Refresh status",
          primaryAction: refreshResult,
          secondaryLabel: "Back to catalog",
          secondaryAction: goCatalog,
        };
      case TransactionStatus.Expired:
        return {
          tone: "danger",
          icon: CircleAlert,
          title: "Checkout expired",
          detail:
            "This order sat unpaid too long and was closed. Start again from your cart if you still want these items.",
          primaryLabel: "Back to catalog",
          primaryAction: goCatalog,
        };
    }
  });

  const toneClass = computed(() => {
    switch (view.value?.tone) {
      case "danger":
        return "text-danger";
      case "wait":
        return "text-muted";
      default:
        return "text-ink";
    }
  });

  const iconWrapClass = computed(() => {
    switch (view.value?.tone) {
      case "danger":
        return "bg-danger-bg text-danger";
      case "wait":
        return "bg-sunken text-muted";
      default:
        return "bg-sunken text-ink";
    }
  });

  const merchandiseTotal = computed(() =>
    computeMerchandiseTotal(
      lines.value.map((line) => ({
        unitPrice: line.productPrice,
        quantity: line.quantity,
      })),
    ),
  );

  const shippingCityLabel = computed(() =>
    shippingCity.value ? SHIPPING_CITY_LABELS[shippingCity.value] : "",
  );

  const purchasedCta = computed(() => purchasedProductsCta(lines.value));

  return {
    loading,
    errorMessage,
    lines,
    merchandiseTotal,
    baseFee,
    deliveryFee,
    shippingCityLabel,
    total,
    deliveryStatus,
    view,
    toneClass,
    iconWrapClass,
    purchasedCta,
    goCatalog,
  };
}
