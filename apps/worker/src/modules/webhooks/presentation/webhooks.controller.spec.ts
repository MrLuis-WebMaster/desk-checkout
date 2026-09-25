import { BadRequestException } from "@nestjs/common";
import { WebhooksController } from "./webhooks.controller";

jest.mock("../../../config/env.js", () => ({
  env: {
    WOMPI_EVENTS_SECRET: "events_test_secret",
    WEBHOOK_MAX_SKEW_SECONDS: 300,
  },
}));

jest.mock("../application/helpers/parse-wompi-webhook.js", () => ({
  parseAndValidateWompiWebhook: jest.fn(),
}));

import { parseAndValidateWompiWebhook } from "../application/helpers/parse-wompi-webhook.js";

describe("WebhooksController", () => {
  const handleEvent = { execute: jest.fn() };
  const controller = new WebhooksController(handleEvent as never);
  const parse = parseAndValidateWompiWebhook as jest.MockedFunction<
    typeof parseAndValidateWompiWebhook
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 on bad checksum", async () => {
    parse.mockReturnValue({
      outcome: "rejected",
      reason: "bad_checksum",
      statusCode: 400,
    });

    await expect(controller.wompi({}, "bad")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(handleEvent.execute).not.toHaveBeenCalled();
  });

  it("returns ok without settling ignored events", async () => {
    parse.mockReturnValue({ outcome: "ignored", reason: "unsupported_event" });
    await expect(controller.wompi({}, "checksum")).resolves.toEqual({
      ok: true,
    });
    expect(handleEvent.execute).not.toHaveBeenCalled();
  });

  it("settles accepted events and returns 200", async () => {
    parse.mockReturnValue({
      outcome: "accepted",
      event: {
        providerTransactionId: "wompi_1",
        status: "APPROVED",
        reference: "tx-1",
        amountInCents: 100,
      },
    } as never);
    handleEvent.execute.mockResolvedValue({ outcome: "settled" });

    await expect(controller.wompi({ data: {} }, "checksum")).resolves.toEqual({
      ok: true,
    });
    expect(handleEvent.execute).toHaveBeenCalled();
  });
});
