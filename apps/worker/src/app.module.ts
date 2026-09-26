import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  CustomerOrmEntity,
  DeliveryOrmEntity,
  IdempotencyKeyOrmEntity,
  InventoryOrmEntity,
  OutboxEventOrmEntity,
  TransactionOrmEntity,
} from "@checkout/settlement-typeorm";
import { env } from "./config/env.js";
import { HealthModule } from "./modules/health/health.module.js";
import { NotificationsModule } from "./modules/notifications/presentation/notifications.module.js";
import { OutboxModule } from "./modules/outbox/presentation/outbox.module.js";
import { PaymentsMessagingModule } from "./modules/payments/presentation/payments-messaging.module.js";
import { ReconciliationModule } from "./modules/reconciliation/presentation/reconciliation.module.js";
import { SettlementModule } from "./modules/settlement/presentation/settlement.module.js";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: env.DB_HOST,
      port: env.DB_PORT,
      username: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      synchronize: false,
      logging: false,
      entities: [
        CustomerOrmEntity,
        DeliveryOrmEntity,
        TransactionOrmEntity,
        IdempotencyKeyOrmEntity,
        InventoryOrmEntity,
        OutboxEventOrmEntity,
      ],
      autoLoadEntities: true,
    }),
    HealthModule,
    SettlementModule,
    PaymentsMessagingModule,
    OutboxModule,
    NotificationsModule,
    ReconciliationModule,
  ],
})
export class AppModule {}
