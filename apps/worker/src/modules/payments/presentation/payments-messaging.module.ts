import { Module } from "@nestjs/common";
import {
  IdempotencyStore,
  SettleProviderPaymentService,
  SettlementLogger,
  SettlementPaymentGateway,
  TransactionReader,
} from "@checkout/settlement";
import {
  RabbitConnectionManager,
} from "@checkout/messaging";
import { env } from "../../../config/env.js";
import { SettlementModule } from "../../settlement/presentation/settlement.module.js";
import { HandleWompiEventUseCase } from "../../webhooks/application/use-cases/handle-wompi-event.use-case.js";
import { PaymentEventConsumer } from "./payment-event.consumer.js";

export const WORKER_RABBIT_CONNECTION = Symbol("WORKER_RABBIT_CONNECTION");

@Module({
  imports: [SettlementModule],
  providers: [
    {
      provide: WORKER_RABBIT_CONNECTION,
      useFactory: () =>
        new RabbitConnectionManager({
          url: env.RABBITMQ_URL,
        }),
    },
    {
      provide: HandleWompiEventUseCase,
      useFactory: (
        transactions: TransactionReader,
        idempotency: IdempotencyStore,
        settlement: SettleProviderPaymentService,
        gateway: SettlementPaymentGateway,
        logger: SettlementLogger,
      ) =>
        new HandleWompiEventUseCase(
          transactions,
          idempotency,
          settlement,
          gateway,
          logger,
        ),
      inject: [
        TransactionReader,
        IdempotencyStore,
        SettleProviderPaymentService,
        SettlementPaymentGateway,
        SettlementLogger,
      ],
    },
    {
      provide: PaymentEventConsumer,
      useFactory: (
        rabbit: RabbitConnectionManager,
        handleEvent: HandleWompiEventUseCase,
      ) => new PaymentEventConsumer(rabbit, handleEvent),
      inject: [WORKER_RABBIT_CONNECTION, HandleWompiEventUseCase],
    },
  ],
  exports: [WORKER_RABBIT_CONNECTION, HandleWompiEventUseCase],
})
export class PaymentsMessagingModule {
  // Force Nest to create the consumer so OnModuleInit runs.
  constructor(private readonly _consumer: PaymentEventConsumer) {}
}
