import { TransactionStatus } from "@checkout/contracts";
import { computeWompiEventChecksum } from "./wompi-event-checksum.js";
import { parseAndValidateWompiWebhook } from "./parse-wompi-webhook.js";

const SECRET = "events_test_secret";

function eventBody(status = "APPROVED") {
  const timestamp = Math.floor(Date.now() / 1000);
  const body = {
    event: "transaction.updated",
    data: {
      transaction: {
        id: "wompi_1",
        status,
        amount_in_cents: 1_200_000,
        reference: "33333333-3333-4333-8333-333333333333",
      },
    },
    timestamp,
    signature: {
      properties: [
        "transaction.id",
        "transaction.status",
        "transaction.amount_in_cents",
      ],
    },
  };
  return {
    ...body,
    signature: {
      ...body.signature,
      checksum: computeWompiEventChecksum(body, SECRET),
    },
  };
}

describe("parseAndValidateWompiWebhook", () => {
  const config = {
    eventsSecret: SECRET,
    maxSkewSeconds: 300,
  };

  it("rejects bad checksum", () => {
    const body = eventBody();
    expect(
      parseAndValidateWompiWebhook(body, "deadbeef".repeat(8), config),
    ).toEqual({
      outcome: "rejected",
      reason: "bad_checksum",
      statusCode: 400,
    });
  });

  it("ignores non transaction.updated events after valid signature", () => {
    const body = eventBody();
    const ignored = {
      ...body,
      event: "nequi_token.updated",
    };
    ignored.signature = {
      ...ignored.signature,
      checksum: computeWompiEventChecksum(ignored, SECRET),
    };
    expect(
      parseAndValidateWompiWebhook(ignored, ignored.signature.checksum, config),
    ).toEqual({ outcome: "ignored", reason: "unknown_type" });
  });

  it("returns a validated event for transaction.updated", () => {
    const body = eventBody();
    expect(
      parseAndValidateWompiWebhook(body, body.signature.checksum, config),
    ).toEqual({
      outcome: "ok",
      event: {
        providerId: "wompi_1",
        status: TransactionStatus.Approved,
        reference: "33333333-3333-4333-8333-333333333333",
        amountInCents: 1_200_000,
      },
    });
  });

  it("accepts authentic events even when the timestamp is outside skew", () => {
    const body = eventBody();
    body.timestamp = Math.floor(Date.now() / 1000) - 3_600;
    body.signature = {
      ...body.signature,
      checksum: computeWompiEventChecksum(body, SECRET),
    };
    expect(
      parseAndValidateWompiWebhook(body, body.signature.checksum, config),
    ).toMatchObject({ outcome: "ok" });
  });
});
