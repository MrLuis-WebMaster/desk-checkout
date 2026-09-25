import { Module } from "@nestjs/common";
import { TypeOrmModule, getDataSourceToken, getRepositoryToken } from "@nestjs/typeorm";
import {
  IdempotencyStore,
  SettleProviderPaymentService,
  SettlementLogger,
  SettlementPaymentGateway,
  TransactionReader,
  TransactionWriter,
} from "@checkout/settlement";
import {
  CustomerOrmEntity,
  DeliveryOrmEntity,
  IdempotencyKeyOrmEntity,
  TransactionOrmEntity,
  TypeOrmIdempotencyStore,
  TypeOrmTransactionReader,
  TypeOrmTransactionWriter,
} from "@checkout/settlement-typeorm";
import { DataSource, Repository } from "typeorm";
import { ProductOrmEntity } from "#modules/catalog/infrastructure/typeorm/product.orm-entity.js";
import { InventoryOrmEntity } from "#modules/inventory/infrastructure/typeorm/inventory.orm-entity.js";
import { PaymentGateway } from "#modules/payments/application/ports/payment-gateway.port.js";
import { PaymentsModule } from "#modules/payments/presentation/payments.module.js";
import { ShippingModule } from "#modules/shipping/presentation/shipping.module.js";
import { env } from "#config/env.js";
import { InventoryWriter } from "../application/ports/inventory-writer.port.js";
import { ProductStockReader } from "../application/ports/product-stock-reader.port.js";
import { CreateTransactionUseCase } from "../application/use-cases/create-transaction.use-case.js";
import { GetTransactionUseCase } from "../application/use-cases/get-transaction.use-case.js";
import { GetWidgetCheckoutSessionUseCase } from "../application/use-cases/get-widget-checkout-session.use-case.js";
import { PayTransactionUseCase } from "../application/use-cases/pay-transaction.use-case.js";
import { SyncProviderPaymentUseCase } from "../application/use-cases/sync-provider-payment.use-case.js";
import { NestSettlementLogger } from "../infrastructure/nest-settlement-logger.js";
import { TypeOrmInventoryWriter } from "../infrastructure/typeorm/typeorm-inventory-writer.js";
import { TypeOrmProductStockReader } from "../infrastructure/typeorm/typeorm-product-stock-reader.js";
import { TransactionsController } from "./controllers/transactions.controller.js";

@Module({
  imports: [
    ShippingModule,
    PaymentsModule,
    TypeOrmModule.forFeature([
      ProductOrmEntity,
      InventoryOrmEntity,
      CustomerOrmEntity,
      DeliveryOrmEntity,
      TransactionOrmEntity,
      IdempotencyKeyOrmEntity,
    ]),
  ],
  controllers: [TransactionsController],
  providers: [
    CreateTransactionUseCase,
    GetTransactionUseCase,
    GetWidgetCheckoutSessionUseCase,
    PayTransactionUseCase,
    SyncProviderPaymentUseCase,
    NestSettlementLogger,
    { provide: SettlementLogger, useExisting: NestSettlementLogger },
    {
      provide: SettlementPaymentGateway,
      useExisting: PaymentGateway,
    },
    {
      provide: SettleProviderPaymentService,
      useFactory: (
        writer: TransactionWriter,
        gateway: SettlementPaymentGateway,
        idempotency: IdempotencyStore,
        logger: SettlementLogger,
      ) =>
        new SettleProviderPaymentService(writer, gateway, idempotency, logger, {
          pollAttempts: 5,
          pollDelayMs: env.NODE_ENV === "test" ? 0 : 1000,
        }),
      inject: [
        TransactionWriter,
        SettlementPaymentGateway,
        IdempotencyStore,
        SettlementLogger,
      ],
    },
    { provide: ProductStockReader, useClass: TypeOrmProductStockReader },
    { provide: InventoryWriter, useClass: TypeOrmInventoryWriter },
    {
      provide: TransactionReader,
      useFactory: (repo: Repository<TransactionOrmEntity>) =>
        new TypeOrmTransactionReader(repo),
      inject: [getRepositoryToken(TransactionOrmEntity)],
    },
    {
      provide: TransactionWriter,
      useFactory: (dataSource: DataSource, inventory: InventoryWriter) =>
        new TypeOrmTransactionWriter(dataSource, (manager, lines) =>
          inventory.decrementManyLocked(manager, lines),
        ),
      inject: [getDataSourceToken(), InventoryWriter],
    },
    {
      provide: IdempotencyStore,
      useFactory: (repo: Repository<IdempotencyKeyOrmEntity>) =>
        new TypeOrmIdempotencyStore(repo),
      inject: [getRepositoryToken(IdempotencyKeyOrmEntity)],
    },
  ],
  exports: [
    TransactionReader,
    TransactionWriter,
    IdempotencyStore,
    SettleProviderPaymentService,
    SettlementLogger,
  ],
})
export class TransactionsModule {}
