import { randomUUID } from "node:crypto";
import {
  PAYMENT_STATUS_CHANGED_TYPE,
  PAYMENT_STATUS_CHANGED_VERSION,
  type PaymentStatusChangedEvent,
} from "@checkout/contracts";
import type { ValidatedWompiTransactionEvent } from "../helpers/parse-wompi-webhook.js";
import { PaymentEventPublisher } from "../ports/payment-event-publisher.port.js";

export class PublishWompiPaymentEventUseCase {
  constructor(private readonly publisher: PaymentEventPublisher) {}

  async execute(event: ValidatedWompiTransactionEvent): Promise<void> {
    const message: PaymentStatusChangedEvent = {
      eventId: randomUUID(),
      version: PAYMENT_STATUS_CHANGED_VERSION,
      type: PAYMENT_STATUS_CHANGED_TYPE,
      occurredAt: new Date().toISOString(),
      data: {
        providerId: event.providerId,
        status: event.status,
        reference: event.reference,
        amountInCents: event.amountInCents,
      },
    };
    await this.publisher.publishPaymentStatusChanged(message);
  }
}
