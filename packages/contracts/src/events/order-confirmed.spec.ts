import {
  ORDER_CONFIRMED_TYPE,
  parseOrderConfirmedEvent,
} from "./order-confirmed.js";

describe("parseOrderConfirmedEvent", () => {
  const valid = {
    eventId: "e1",
    version: 1,
    type: ORDER_CONFIRMED_TYPE,
    transactionId: "t1",
    customerId: "c1",
    deliveryId: "d1",
    occurredAt: "2026-01-01T00:00:00.000Z",
  };

  it("accepts a version-1 order.confirmed event", () => {
    expect(parseOrderConfirmedEvent(valid)).toEqual({
      ok: true,
      event: valid,
    });
  });

  it("rejects an unsupported version", () => {
    expect(parseOrderConfirmedEvent({ ...valid, version: 2 })).toEqual({
      ok: false,
      reason: "unsupported_version",
    });
  });

  it("rejects a missing transactionId", () => {
    const { transactionId: _t, ...rest } = valid;
    expect(parseOrderConfirmedEvent(rest)).toEqual({
      ok: false,
      reason: "missing_transactionId",
    });
  });

  it("rejects a non-object payload", () => {
    expect(parseOrderConfirmedEvent(null)).toEqual({
      ok: false,
      reason: "not_object",
    });
  });
});
