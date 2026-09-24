import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HealthModule } from "#modules/health/presentation/health.module.js";
import { buildDataSourceOptions } from "#shared/infrastructure/persistence/typeorm.data-source.js";
import { CatalogModule } from "#modules/catalog/presentation/catalog.module.js";
import { ShippingModule } from "#modules/shipping/presentation/shipping.module.js";
import { TransactionsModule } from "#modules/transactions/presentation/transactions.module.js";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...buildDataSourceOptions(),
      autoLoadEntities: true,
    }),
    HealthModule,
    CatalogModule,
    ShippingModule,
    TransactionsModule,
  ],
})
export class AppModule {}
