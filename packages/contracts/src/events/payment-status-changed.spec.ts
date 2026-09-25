import { TransactionStatus } from "../index.js";
import {
  PAYMENT_STATUS_CHANGED_TYPE,
  parsePaymentStatusChangedEvent,
} from "./payment-status-changed.js";

describe("parsePaymentStatusChangedEvent", () => {
  const valid = {
    eventId: "evt-1",
    version: 1,
    type: PAYMENT_STATUS_CHANGED_TYPE,
    occurredAt: "2026-01-01T00:00:00.000Z",
    data: {
      providerId: "wompi_1",
      status: TransactionStatus.Approved,
      reference: "tx-1",
      amountInCents: 1000,
    },
  };

  it("accepts a version-1 payment.status.changed event", () => {
    expect(parsePaymentStatusChangedEvent(valid)).toEqual({
      ok: true,
      event: valid,
    });
  });

  it("rejects an unsupported version", () => {
    expect(
      parsePaymentStatusChangedEvent({ ...valid, version: 2 }),
    ).toEqual({ ok: false, reason: "unsupported_version" });
  });

  it("rejects a payload without providerId", () => {
    expect(
      parsePaymentStatusChangedEvent({
        ...valid,
        data: { status: TransactionStatus.Approved },
      }),
    ).toEqual({ ok: false, reason: "missing_provider_id" });
  });
});
