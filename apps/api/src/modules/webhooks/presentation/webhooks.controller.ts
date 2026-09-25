import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  ServiceUnavailableException,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { ApiExcludeController } from "@nestjs/swagger";
import { RabbitUnavailableError } from "@checkout/messaging";
import { env } from "#config/env.js";
import { parseAndValidateWompiWebhook } from "../application/helpers/parse-wompi-webhook.js";
import { PublishWompiPaymentEventUseCase } from "../application/use-cases/publish-wompi-payment-event.use-case.js";

@ApiExcludeController()
@Controller("webhooks")
export class WebhooksController {
  constructor(
    private readonly publishEvent: PublishWompiPaymentEventUseCase,
  ) {}

  @Post("wompi")
  @HttpCode(200)
  @SkipThrottle({ default: true })
  async wompi(
    @Body() body: unknown,
    @Headers("x-event-checksum") checksum: string | undefined,
  ) {
    const parsed = parseAndValidateWompiWebhook(body, checksum, {
      eventsSecret: env.WOMPI_EVENTS_SECRET,
      maxSkewSeconds: env.WEBHOOK_MAX_SKEW_SECONDS,
    });

    if (parsed.outcome === "rejected") {
      throw new BadRequestException({ ok: false, reason: parsed.reason });
    }
    if (parsed.outcome === "ignored") {
      return { ok: true };
    }

    try {
      await this.publishEvent.execute(parsed.event);
    } catch (error) {
      if (error instanceof RabbitUnavailableError) {
        throw new ServiceUnavailableException({
          ok: false,
          reason: "broker_unavailable",
        });
      }
      throw new ServiceUnavailableException({
        ok: false,
        reason: "broker_publish_failed",
      });
    }
    return { ok: true };
  }
}
