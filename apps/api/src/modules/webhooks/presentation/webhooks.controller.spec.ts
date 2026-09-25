import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { RabbitUnavailableError } from "@checkout/messaging";
import { WebhooksController } from "./webhooks.controller";

jest.mock("#config/env.js", () => ({
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
  const publishEvent = { execute: jest.fn() };
  const controller = new WebhooksController(publishEvent as never);
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
    expect(publishEvent.execute).not.toHaveBeenCalled();
  });

  it("returns ok without publishing ignored events", async () => {
    parse.mockReturnValue({ outcome: "ignored", reason: "unsupported_event" });
    await expect(controller.wompi({}, "checksum")).resolves.toEqual({
      ok: true,
    });
    expect(publishEvent.execute).not.toHaveBeenCalled();
  });

  it("publishes accepted events and returns 200", async () => {
    parse.mockReturnValue({
      outcome: "ok",
      event: {
        providerId: "wompi_1",
        status: "APPROVED" as never,
        reference: "tx-1",
        amountInCents: 100,
      },
    });
    publishEvent.execute.mockResolvedValue(undefined);

    await expect(controller.wompi({ data: {} }, "checksum")).resolves.toEqual({
      ok: true,
    });
    expect(publishEvent.execute).toHaveBeenCalled();
  });

  it("returns 503 when the broker is unavailable", async () => {
    parse.mockReturnValue({
      outcome: "ok",
      event: {
        providerId: "wompi_1",
        status: "APPROVED" as never,
      },
    });
    publishEvent.execute.mockRejectedValue(new RabbitUnavailableError());

    await expect(controller.wompi({}, "checksum")).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
