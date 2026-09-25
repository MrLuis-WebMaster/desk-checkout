import { Module } from "@nestjs/common";
import {
  IdempotencyStore,
  SettleProviderPaymentService,
  SettlementLogger,
  SettlementPaymentGateway,
  TransactionReader,
  TransactionWriter,
} from "@checkout/settlement";
import { env } from "../../../config/env.js";
import { SettlementModule } from "../../settlement/presentation/settlement.module.js";
import { ExpireOrphanPendingUseCase } from "../application/use-cases/expire-orphan-pending.use-case.js";
import { ProcessStuckPendingUseCase } from "../application/use-cases/process-stuck-pending.use-case.js";
import { ReconciliationScheduler } from "./reconciliation.scheduler.js";

@Module({
  imports: [SettlementModule],
  providers: [
    {
      provide: ProcessStuckPendingUseCase,
      useFactory: (
        transactions: TransactionReader,
        gateway: SettlementPaymentGateway,
        idempotency: IdempotencyStore,
        settlement: SettleProviderPaymentService,
        logger: SettlementLogger,
      ) =>
        new ProcessStuckPendingUseCase(
          transactions,
          gateway,
          idempotency,
          settlement,
          logger,
          env.STUCK_PENDING_AFTER_MS,
        ),
      inject: [
        TransactionReader,
        SettlementPaymentGateway,
        IdempotencyStore,
        SettleProviderPaymentService,
        SettlementLogger,
      ],
    },
    {
      provide: ExpireOrphanPendingUseCase,
      useFactory: (
        transactions: TransactionReader,
        writer: TransactionWriter,
        logger: SettlementLogger,
      ) =>
        new ExpireOrphanPendingUseCase(
          transactions,
          writer,
          logger,
          env.ORPHAN_PENDING_TTL_MS,
          env.STUCK_PENDING_AFTER_MS,
        ),
      inject: [TransactionReader, TransactionWriter, SettlementLogger],
    },
    ReconciliationScheduler,
  ],
})
export class ReconciliationModule {}
