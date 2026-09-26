import type { TransactionStatus } from "../index.js";

export const PAYMENT_STATUS_CHANGED_TYPE = "payment.status.changed" as const;
export const PAYMENT_STATUS_CHANGED_VERSION = 1 as const;

/** Keep in sync with `TransactionStatus` — runtime set avoids a circular import. */
const TRANSACTION_STATUSES: ReadonlySet<string> = new Set([
  "PENDING",
  "APPROVED",
  "DECLINED",
  "ERROR",
  "EXPIRED",
]);

export type PaymentStatusChangedEvent = {
  eventId: string;
  version: typeof PAYMENT_STATUS_CHANGED_VERSION;
  type: typeof PAYMENT_STATUS_CHANGED_TYPE;
  occurredAt: string;
  data: {
    providerId: string;
    status: TransactionStatus;
    reference?: string;
    amountInCents?: number;
  };
};

export type ParsePaymentStatusChangedResult =
  | { ok: true; event: PaymentStatusChangedEvent }
  | { ok: false; reason: string };

export function parsePaymentStatusChangedEvent(
  value: unknown,
): ParsePaymentStatusChangedResult {
  if (value === null || typeof value !== "object") {
    return { ok: false, reason: "not_object" };
  }
  const raw = value as Record<string, unknown>;
  if (raw.type !== PAYMENT_STATUS_CHANGED_TYPE) {
    return { ok: false, reason: "unknown_type" };
  }
  if (raw.version !== PAYMENT_STATUS_CHANGED_VERSION) {
    return { ok: false, reason: "unsupported_version" };
  }
  if (typeof raw.eventId !== "string" || raw.eventId.trim().length === 0) {
    return { ok: false, reason: "missing_event_id" };
  }
  if (typeof raw.occurredAt !== "string" || raw.occurredAt.trim().length === 0) {
    return { ok: false, reason: "missing_occurred_at" };
  }
  if (raw.data === null || typeof raw.data !== "object") {
    return { ok: false, reason: "missing_data" };
  }
  const data = raw.data as Record<string, unknown>;
  if (typeof data.providerId !== "string" || data.providerId.trim().length === 0) {
    return { ok: false, reason: "missing_provider_id" };
  }
  if (
    typeof data.status !== "string" ||
    !TRANSACTION_STATUSES.has(data.status)
  ) {
    return { ok: false, reason: "invalid_status" };
  }

  const event: PaymentStatusChangedEvent = {
    eventId: raw.eventId,
    version: PAYMENT_STATUS_CHANGED_VERSION,
    type: PAYMENT_STATUS_CHANGED_TYPE,
    occurredAt: raw.occurredAt,
    data: {
      providerId: data.providerId,
      status: data.status as TransactionStatus,
    },
  };
  if (typeof data.reference === "string") {
    event.data.reference = data.reference;
  }
  if (typeof data.amountInCents === "number") {
    event.data.amountInCents = data.amountInCents;
  }
  return { ok: true, event };
}
