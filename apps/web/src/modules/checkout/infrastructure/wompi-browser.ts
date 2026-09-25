export type WompiCardTokenInput = {
  number: string;
  cvc: string;
  expMonth: string;
  expYear: string;
  cardHolder: string;
};

export type WompiCardTokenResult =
  | { ok: true; token: string }
  | { ok: false; message: string };

/** Sandbox vs production API host from the public key prefix. */
export function wompiApiBaseUrl(publicKey: string): string {
  return publicKey.startsWith("pub_prod_")
    ? "https://production.wompi.co/v1"
    : "https://sandbox.wompi.co/v1";
}

/**
 * Tokenizes a card with the merchant public key (safe in the browser).
 * Colombia sandbox still accepts the classic plaintext body for tests.
 */
export async function tokenizeWompiCard(
  publicKey: string,
  input: WompiCardTokenInput,
): Promise<WompiCardTokenResult> {
  try {
    const response = await fetch(`${wompiApiBaseUrl(publicKey)}/tokens/cards`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${publicKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: input.number.replace(/\s+/g, ""),
        cvc: input.cvc,
        exp_month: input.expMonth.padStart(2, "0"),
        exp_year: input.expYear.slice(-2),
        card_holder: input.cardHolder.trim(),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await response.json()) as {
      data?: { id?: string };
      error?: { reason?: string; messages?: unknown };
    };
    const token = body.data?.id;
    if (!response.ok || !token) {
      return {
        ok: false,
        message:
          body.error?.reason ??
          "We couldn't tokenize that card. Check the details and try again.",
      };
    }
    return { ok: true, token };
  } catch {
    return {
      ok: false,
      message: "Couldn't reach Wompi to tokenize the card. Try again.",
    };
  }
}

export type WidgetCheckoutConfig = {
  currency: "COP";
  amountInCents: number;
  reference: string;
  publicKey: string;
  signature: { integrity: string };
  redirectUrl?: string;
  customerData?: {
    email?: string;
    fullName?: string;
    phoneNumber?: string;
    phoneNumberPrefix?: string;
  };
};

export type WidgetCheckoutResult = {
  transaction?: {
    id?: string;
    status?: string;
  };
};

type WidgetCheckoutInstance = {
  open: (callback?: (result: WidgetCheckoutResult) => void) => void;
};

type WidgetCheckoutConstructor = new (
  config: WidgetCheckoutConfig,
) => WidgetCheckoutInstance;

declare global {
  interface Window {
    WidgetCheckout?: WidgetCheckoutConstructor;
  }
}

let widgetScriptPromise: Promise<void> | null = null;

export function loadWompiWidgetScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window unavailable"));
  }
  if (window.WidgetCheckout) {
    return Promise.resolve();
  }
  if (widgetScriptPromise) {
    return widgetScriptPromise;
  }

  widgetScriptPromise = new Promise((resolve, reject) => {
    const succeed = () => {
      if (window.WidgetCheckout) {
        resolve();
        return;
      }
      widgetScriptPromise = null;
      reject(new Error("Wompi WidgetCheckout is unavailable"));
    };
    const fail = () => {
      widgetScriptPromise = null;
      reject(new Error("Failed to load Wompi widget"));
    };

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-wompi-widget="true"]',
    );
    if (existing) {
      if (window.WidgetCheckout) {
        succeed();
        return;
      }
      existing.addEventListener("load", succeed, { once: true });
      existing.addEventListener("error", fail, { once: true });
      // Script may already be complete; load never fires again.
      queueMicrotask(() => {
        if (window.WidgetCheckout) {
          succeed();
        }
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.wompi.co/widget.js";
    script.async = true;
    script.dataset.wompiWidget = "true";
    script.onload = succeed;
    script.onerror = fail;
    document.head.appendChild(script);
  });

  return widgetScriptPromise;
}

export async function openWompiWidgetCheckout(
  config: WidgetCheckoutConfig,
  onComplete?: (result: WidgetCheckoutResult) => void,
): Promise<void> {
  await loadWompiWidgetScript();
  const WidgetCheckout = window.WidgetCheckout;
  if (!WidgetCheckout) {
    throw new Error("Wompi WidgetCheckout is unavailable");
  }
  const checkout = new WidgetCheckout(config);
  checkout.open((result) => {
    onComplete?.(result ?? {});
  });
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
