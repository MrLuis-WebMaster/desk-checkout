import { mapWompiStatus } from "../../../settlement/infrastructure/wompi/map-wompi-status.js";
import type { ValidatedWompiTransactionEvent } from "../use-cases/handle-wompi-event.use-case.js";
import {
  isTimestampWithinSkew,
  verifyWompiEventChecksum,
  type WompiEventPayload,
} from "./wompi-event-checksum.js";

export type ParseWompiWebhookResult =
  | { outcome: "ok"; event: ValidatedWompiTransactionEvent }
  | { outcome: "ignored"; reason: string }
  | { outcome: "rejected"; reason: "bad_checksum" | "skew"; statusCode: 400 };

type TransactionEventData = {
  id?: string;
  status?: string;
  reference?: string;
  amount_in_cents?: number;
};

export type WompiWebhookParseConfig = {
  eventsSecret: string;
  maxSkewSeconds: number;
  nowMs?: number;
};

/** Edge parse/validate — checksum, skew, event type, status mapping. */
export function parseAndValidateWompiWebhook(
  body: unknown,
  headerChecksum: string | undefined,
  config: WompiWebhookParseConfig,
): ParseWompiWebhookResult {
  const event = body as WompiEventPayload;
  const checksum =
    headerChecksum?.trim() ||
    event.signature?.checksum?.trim() ||
    undefined;

  if (!verifyWompiEventChecksum(event, config.eventsSecret, checksum)) {
    return { outcome: "rejected", reason: "bad_checksum", statusCode: 400 };
  }

  if (
    !isTimestampWithinSkew(
      event.timestamp,
      config.nowMs ?? Date.now(),
      config.maxSkewSeconds,
    )
  ) {
    return { outcome: "rejected", reason: "skew", statusCode: 400 };
  }

  if (event.event !== "transaction.updated") {
    return { outcome: "ignored", reason: "unknown_type" };
  }

  const txData = (event.data?.transaction ?? {}) as TransactionEventData;
  const providerId = txData.id;
  const reference = txData.reference;
  const wompiStatus = txData.status;
  const amountInCents = txData.amount_in_cents;

  if (!providerId || !wompiStatus) {
    return { outcome: "ignored", reason: "incomplete_payload" };
  }

  let providerStatus;
  try {
    providerStatus = mapWompiStatus(wompiStatus);
  } catch {
    return { outcome: "ignored", reason: "unsupported_status" };
  }

  return {
    outcome: "ok",
    event: {
      providerId,
      status: providerStatus,
      reference,
      amountInCents:
        typeof amountInCents === "number" ? amountInCents : undefined,
    },
  };
}
