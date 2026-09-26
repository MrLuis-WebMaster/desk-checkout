export const ORDER_CONFIRMED_TYPE = "order.confirmed" as const;
export const ORDER_CONFIRMED_VERSION = 1 as const;

export type OrderConfirmedEvent = {
  eventId: string;
  version: typeof ORDER_CONFIRMED_VERSION;
  type: typeof ORDER_CONFIRMED_TYPE;
  transactionId: string;
  customerId: string;
  deliveryId: string;
  occurredAt: string;
};

export type ParseOrderConfirmedResult =
  | { ok: true; event: OrderConfirmedEvent }
  | { ok: false; reason: string };

export function parseOrderConfirmedEvent(
  value: unknown,
): ParseOrderConfirmedResult {
  if (value === null || typeof value !== "object") {
    return { ok: false, reason: "not_object" };
  }
  const raw = value as Record<string, unknown>;
  if (raw.type !== ORDER_CONFIRMED_TYPE) {
    return { ok: false, reason: "unknown_type" };
  }
  if (raw.version !== ORDER_CONFIRMED_VERSION) {
    return { ok: false, reason: "unsupported_version" };
  }
  const required = [
    "eventId",
    "transactionId",
    "customerId",
    "deliveryId",
    "occurredAt",
  ] as const;
  for (const key of required) {
    if (typeof raw[key] !== "string" || (raw[key] as string).trim().length === 0) {
      return { ok: false, reason: `missing_${key}` };
    }
  }
  return {
    ok: true,
    event: {
      eventId: raw.eventId as string,
      version: ORDER_CONFIRMED_VERSION,
      type: ORDER_CONFIRMED_TYPE,
      transactionId: raw.transactionId as string,
      customerId: raw.customerId as string,
      deliveryId: raw.deliveryId as string,
      occurredAt: raw.occurredAt as string,
    },
  };
}
