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
  private started = false;

  constructor(
    private readonly rabbit: RabbitConnectionManager,
    private readonly handleEvent: HandleWompiEventUseCase,
  ) {}

  onModuleInit(): void {
    this.rabbit.start();
    void this.attachWhenReady();
  }

  async onModuleDestroy(): Promise<void> {
    await this.rabbit.stop();
  }

  private async attachWhenReady(): Promise<void> {
    for (let attempt = 0; attempt < 120 && !this.started; attempt += 1) {
      if (this.rabbit.isConnected()) {
        try {
          await this.rabbit.consume(PAYMENT_EVENTS_QUEUES, async (payload) => {
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
          });
          this.started = true;
          this.logger.log({ event: "payment_consumer_attached" });
          return;
        } catch (error) {
          this.logger.error({
            event: "payment_consumer_attach_failed",
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      await delay(500);
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
