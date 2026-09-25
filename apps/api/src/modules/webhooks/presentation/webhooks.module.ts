import { Inject, Module, OnModuleDestroy } from "@nestjs/common";
import { RabbitConnectionManager } from "@checkout/messaging";
import { env } from "#config/env.js";
import { PaymentEventPublisher } from "../application/ports/payment-event-publisher.port.js";
import { PublishWompiPaymentEventUseCase } from "../application/use-cases/publish-wompi-payment-event.use-case.js";
import { RabbitMqPaymentEventPublisher } from "../infrastructure/rabbitmq-payment-event-publisher.js";
import { WebhooksController } from "./webhooks.controller.js";

export const RABBIT_CONNECTION = Symbol("RABBIT_CONNECTION");

@Module({
  controllers: [WebhooksController],
  providers: [
    {
      provide: RABBIT_CONNECTION,
      useFactory: () => {
        const rabbit = new RabbitConnectionManager({
          url: env.RABBITMQ_URL,
        });
        // Never await — API must boot even when RabbitMQ is down.
        rabbit.start();
        return rabbit;
      },
    },
    {
      provide: PaymentEventPublisher,
      useFactory: (rabbit: RabbitConnectionManager) =>
        new RabbitMqPaymentEventPublisher(rabbit),
      inject: [RABBIT_CONNECTION],
    },
    {
      provide: PublishWompiPaymentEventUseCase,
      useFactory: (publisher: PaymentEventPublisher) =>
        new PublishWompiPaymentEventUseCase(publisher),
      inject: [PaymentEventPublisher],
    },
  ],
  exports: [RABBIT_CONNECTION],
})
export class WebhooksModule implements OnModuleDestroy {
  constructor(
    @Inject(RABBIT_CONNECTION)
    private readonly rabbit: RabbitConnectionManager,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.rabbit.stop();
  }
}
