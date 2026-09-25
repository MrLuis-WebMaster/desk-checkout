import type { PaymentStatusChangedEvent } from "@checkout/contracts";

export abstract class PaymentEventPublisher {
  abstract publishPaymentStatusChanged(
    event: PaymentStatusChangedEvent,
  ): Promise<void>;
}
