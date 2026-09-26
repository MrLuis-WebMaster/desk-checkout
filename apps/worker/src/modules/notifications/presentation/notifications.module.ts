import { Module } from "@nestjs/common";
import { RabbitConnectionManager } from "@checkout/messaging";
import {
  PaymentsMessagingModule,
  WORKER_RABBIT_CONNECTION,
} from "../../payments/presentation/payments-messaging.module.js";
import { NotificationPort } from "../application/ports/notification.port.js";
import { NoopNotificationAdapter } from "../infrastructure/noop-notification.adapter.js";
import { OrderConfirmedConsumer } from "./order-confirmed.consumer.js";

@Module({
  imports: [PaymentsMessagingModule],
  providers: [
    {
      provide: NotificationPort,
      useClass: NoopNotificationAdapter,
    },
    {
      provide: OrderConfirmedConsumer,
      useFactory: (
        rabbit: RabbitConnectionManager,
        notifications: NotificationPort,
      ) => new OrderConfirmedConsumer(rabbit, notifications),
      inject: [WORKER_RABBIT_CONNECTION, NotificationPort],
    },
  ],
})
export class NotificationsModule {
  constructor(private readonly _consumer: OrderConfirmedConsumer) {}
}
