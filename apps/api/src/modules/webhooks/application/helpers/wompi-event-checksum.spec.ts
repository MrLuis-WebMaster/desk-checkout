import { createHash } from "node:crypto";
import {
  computeWompiEventChecksum,
  isTimestampWithinSkew,
  verifyWompiEventChecksum,
  type WompiEventPayload,
} from "./wompi-event-checksum.js";

const SECRET = "events_test_secret";

function sampleEvent(
  overrides: Partial<WompiEventPayload> = {},
): WompiEventPayload {
  return {
    event: "transaction.updated",
    data: {
      transaction: {
        id: "1234-1610641025-49201",
        status: "APPROVED",
        amount_in_cents: 4490000,
        reference: "33333333-3333-4333-8333-333333333333",
      },
    },
    timestamp: 1_530_291_411,
    signature: {
      properties: [
        "transaction.id",
        "transaction.status",
        "transaction.amount_in_cents",
      ],
    },
    ...overrides,
  };
}

describe("wompi event checksum", () => {
  it("matches the docs concatenation example shape", () => {
    const event = sampleEvent();
    const checksum = computeWompiEventChecksum(event, SECRET);
    expect(checksum).toHaveLength(64);
    expect(
      verifyWompiEventChecksum(event, SECRET, checksum.toUpperCase()),
    ).toBe(true);
  });

  it("rejects a tampered checksum with timing-safe compare", () => {
    const event = sampleEvent();
    const good = computeWompiEventChecksum(event, SECRET);
    const bad = createHash("sha256").update("tampered").digest("hex");
    expect(bad).toHaveLength(good.length);
    expect(verifyWompiEventChecksum(event, SECRET, bad)).toBe(false);
  });

  it("enforces skew window", () => {
    const now = Date.UTC(2026, 0, 1, 12, 0, 0);
    const nowSeconds = Math.floor(now / 1000);
    expect(isTimestampWithinSkew(nowSeconds, now, 300)).toBe(true);
    expect(isTimestampWithinSkew(nowSeconds - 301, now, 300)).toBe(false);
  });
});
