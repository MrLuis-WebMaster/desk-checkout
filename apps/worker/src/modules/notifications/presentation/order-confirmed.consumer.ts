import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { parseOrderConfirmedEvent } from "@checkout/contracts";
import {
  DeadLetterError,
  ORDER_CONFIRMED_QUEUES,
  RabbitConnectionManager,
} from "@checkout/messaging";
import { NotificationPort } from "../application/ports/notification.port.js";

@Injectable()
export class OrderConfirmedConsumer implements OnModuleInit {
  private readonly logger = new Logger(OrderConfirmedConsumer.name);

  constructor(
    private readonly rabbit: RabbitConnectionManager,
    private readonly notifications: NotificationPort,
  ) {}

  onModuleInit(): void {
    // Shared manager is started by PaymentEventConsumer. Register immediately
    // so a late broker recovery still rebinds this subscription.
    void this.rabbit
      .consume(ORDER_CONFIRMED_QUEUES, async (payload) => {
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
      })
      .then(() => {
        this.logger.log({ event: "order_confirmed_consumer_registered" });
      })
      .catch((error: unknown) => {
        this.logger.error({
          event: "order_confirmed_consumer_register_failed",
          error: error instanceof Error ? error.message : String(error),
        });
      });
  }
}
