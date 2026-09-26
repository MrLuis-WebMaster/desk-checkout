import { Injectable } from "@nestjs/common";
import type { PaymentStatusChangedEvent } from "@checkout/contracts";
import {
  PAYMENT_EVENTS_QUEUES,
  RabbitConnectionManager,
} from "@checkout/messaging";
import { PaymentEventPublisher } from "../application/ports/payment-event-publisher.port.js";

@Injectable()
export class RabbitMqPaymentEventPublisher extends PaymentEventPublisher {
  constructor(private readonly rabbit: RabbitConnectionManager) {
    super();
  }

  async publishPaymentStatusChanged(
    event: PaymentStatusChangedEvent,
  ): Promise<void> {
    await this.rabbit.publish(PAYMENT_EVENTS_QUEUES.main, event);
  }
}
