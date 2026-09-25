import { ref } from "vue";
import { useRouter } from "vue-router";
import { routeNames } from "@/app/router";
import {
  getWidgetSession,
  openWompiWidgetCheckout,
} from "@/modules/checkout/composition";

/** Wompi checkout rejects non-HTTPS redirect URLs with HTTP 403. */
function httpsRedirectUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function useWompiWidget(options: {
  resolveTransactionId: () => Promise<
    | { status: "ok"; transactionId: string }
    | { status: "error"; message: string }
  >;
  redirectUrl: (transactionId: string) => string;
  customerEmail?: () => string | undefined;
  customerFullName?: () => string | undefined;
  customerPhone?: () => string | undefined;
}) {
  const router = useRouter();
  const loading = ref(false);
  const errorMessage = ref("");

  async function openWidget() {
    errorMessage.value = "";
    loading.value = true;
    try {
      const resolved = await options.resolveTransactionId();
      if (resolved.status !== "ok") {
        errorMessage.value = resolved.message;
        return;
      }
      const transactionId = resolved.transactionId;

      const session = await getWidgetSession(transactionId);
      if (session.status !== "ok") {
        errorMessage.value =
          session.status === "not_found"
            ? "That order is no longer available."
            : "Couldn't prepare other payment methods. Try again.";
        return;
      }

      await openWompiWidgetCheckout(
        {
          currency: session.value.currency,
          amountInCents: session.value.amountInCents,
          reference: session.value.reference,
          publicKey: session.value.publicKey,
          signature: { integrity: session.value.signature },
          redirectUrl: httpsRedirectUrl(options.redirectUrl(transactionId)),
          customerData: {
            email: options.customerEmail?.(),
            fullName: options.customerFullName?.(),
            phoneNumber: options.customerPhone?.(),
            phoneNumberPrefix: options.customerPhone?.() ? "+57" : undefined,
          },
        },
        (result) => {
          const providerId = result.transaction?.id?.trim();
          if (!providerId) {
            return;
          }
          // Cart/pending cleanup happens on the result page via finalizeCheckout.
          void router.push({
            name: routeNames.checkoutResult,
            params: { transactionId },
            query: { id: providerId },
          });
        },
      );
    } catch {
      errorMessage.value = "Couldn't open Wompi checkout. Try again.";
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    errorMessage,
    openWidget,
  };
}
