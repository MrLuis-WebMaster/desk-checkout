import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
} from "@nestjs/common";
import { env } from "../../../config/env.js";
import { parseAndValidateWompiWebhook } from "../application/helpers/parse-wompi-webhook.js";
import { HandleWompiEventUseCase } from "../application/use-cases/handle-wompi-event.use-case.js";

@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly handleEvent: HandleWompiEventUseCase) {}

  @Post("wompi")
  @HttpCode(200)
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

    await this.handleEvent.execute(parsed.event);
    return { ok: true };
  }
}
