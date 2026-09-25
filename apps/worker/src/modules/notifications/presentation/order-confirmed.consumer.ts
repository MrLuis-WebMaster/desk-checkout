import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { parseOrderConfirmedEvent } from "@checkout/contracts";
import {
  DeadLetterError,
  ORDER_CONFIRMED_QUEUES,
  RabbitConnectionManager,
} from "@checkout/messaging";
import { NotificationPort } from "../application/ports/notification.port.js";

@Injectable()
export class OrderConfirmedConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderConfirmedConsumer.name);
  private started = false;

  constructor(
    private readonly rabbit: RabbitConnectionManager,
    private readonly notifications: NotificationPort,
  ) {}

  onModuleInit(): void {
    void this.attachWhenReady();
  }

  async onModuleDestroy(): Promise<void> {
    // Connection owned by PaymentsMessagingModule / shared manager.
  }

  private async attachWhenReady(): Promise<void> {
    for (let attempt = 0; attempt < 120 && !this.started; attempt += 1) {
      if (this.rabbit.isConnected()) {
        try {
          await this.rabbit.consume(ORDER_CONFIRMED_QUEUES, async (payload) => {
            const parsed = parseOrderConfirmedEvent(payload);
            if (!parsed.ok) {
              if (parsed.reason === "unsupported_version") {
                throw new DeadLetterError(parsed.reason);
              }
              this.logger.log({
                event: "order_confirmed_ignored",
                reason: parsed.reason,
              });
              return;
            }
            await this.notifications.sendOrderConfirmed({
              transactionId: parsed.event.transactionId,
              customerId: parsed.event.customerId,
            });
          });
          this.started = true;
          this.logger.log({ event: "order_confirmed_consumer_attached" });
          return;
        } catch (error) {
          this.logger.error({
            event: "order_confirmed_consumer_attach_failed",
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
