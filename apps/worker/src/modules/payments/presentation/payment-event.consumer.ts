import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  parsePaymentStatusChangedEvent,
} from "@checkout/contracts";
import {
  DeadLetterError,
  PAYMENT_EVENTS_QUEUES,
  RabbitConnectionManager,
} from "@checkout/messaging";
import { HandleWompiEventUseCase } from "../../webhooks/application/use-cases/handle-wompi-event.use-case.js";

@Injectable()
export class PaymentEventConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentEventConsumer.name);

  constructor(
    private readonly rabbit: RabbitConnectionManager,
    private readonly handleEvent: HandleWompiEventUseCase,
  ) {}

  onModuleInit(): void {
    this.rabbit.start();
    // Register even if the broker is down — the manager rebinds on reconnect.
    void this.rabbit
      .consume(PAYMENT_EVENTS_QUEUES, async (payload) => {
        const parsed = parsePaymentStatusChangedEvent(payload);
        if (!parsed.ok) {
          if (parsed.reason === "unsupported_version") {
            throw new DeadLetterError(parsed.reason);
          }
          this.logger.log({
            event: "payment_event_ignored",
            reason: parsed.reason,
          });
          return;
        }
        await this.handleEvent.execute(parsed.event.data);
      })
      .then(() => {
        this.logger.log({ event: "payment_consumer_registered" });
      })
      .catch((error: unknown) => {
        this.logger.error({
          event: "payment_consumer_register_failed",
          error: error instanceof Error ? error.message : String(error),
        });
      });
  }

  async onModuleDestroy(): Promise<void> {
    await this.rabbit.stop();
  }
}
