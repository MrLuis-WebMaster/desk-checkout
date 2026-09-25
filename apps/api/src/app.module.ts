import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HealthModule } from "#modules/health/presentation/health.module.js";
import { DEFAULT_THROTTLE } from "#shared/infrastructure/http/throttle-limits.js";
import { buildDataSourceOptions } from "#shared/infrastructure/persistence/typeorm.data-source.js";
import { CatalogModule } from "#modules/catalog/presentation/catalog.module.js";
import { CustomersModule } from "#modules/customers/presentation/customers.module.js";
import { DeliveriesModule } from "#modules/deliveries/presentation/deliveries.module.js";
import { ShippingModule } from "#modules/shipping/presentation/shipping.module.js";
import { PaymentsModule } from "#modules/payments/presentation/payments.module.js";
import { TransactionsModule } from "#modules/transactions/presentation/transactions.module.js";
import { WebhooksModule } from "#modules/webhooks/presentation/webhooks.module.js";

@Module({
  imports: [
    ThrottlerModule.forRoot([DEFAULT_THROTTLE]),
    TypeOrmModule.forRoot({
      ...buildDataSourceOptions(),
      autoLoadEntities: true,
    }),
    HealthModule,
    CatalogModule,
    CustomersModule,
    DeliveriesModule,
    ShippingModule,
    PaymentsModule,
    TransactionsModule,
    WebhooksModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
