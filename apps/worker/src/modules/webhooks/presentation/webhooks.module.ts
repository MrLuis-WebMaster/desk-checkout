import { Module } from "@nestjs/common";
import {
  IdempotencyStore,
  SettleProviderPaymentService,
  SettlementLogger,
  SettlementPaymentGateway,
  TransactionReader,
} from "@checkout/settlement";
import { SettlementModule } from "../../settlement/presentation/settlement.module.js";
import { HandleWompiEventUseCase } from "../application/use-cases/handle-wompi-event.use-case.js";
import { WebhooksController } from "./webhooks.controller.js";

@Module({
  imports: [SettlementModule],
  controllers: [WebhooksController],
  providers: [
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
  ],
})
export class WebhooksModule {}
