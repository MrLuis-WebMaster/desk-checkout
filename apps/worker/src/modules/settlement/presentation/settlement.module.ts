import { Module } from "@nestjs/common";
import {
  TypeOrmModule,
  getDataSourceToken,
  getRepositoryToken,
} from "@nestjs/typeorm";
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
  InventoryOrmEntity,
  TransactionOrmEntity,
  TypeOrmIdempotencyStore,
  TypeOrmTransactionReader,
  TypeOrmTransactionWriter,
  decrementManyLocked,
} from "@checkout/settlement-typeorm";
import { DataSource, Repository } from "typeorm";
import { env } from "../../../config/env.js";
import { NestSettlementLogger } from "../infrastructure/nest-settlement-logger.js";
import { WompiHttpPaymentGateway } from "../infrastructure/wompi/wompi-http-payment-gateway.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerOrmEntity,
      DeliveryOrmEntity,
      TransactionOrmEntity,
      IdempotencyKeyOrmEntity,
      InventoryOrmEntity,
    ]),
  ],
  providers: [
    NestSettlementLogger,
    { provide: SettlementLogger, useExisting: NestSettlementLogger },
    {
      provide: TransactionReader,
      useFactory: (repo: Repository<TransactionOrmEntity>) =>
        new TypeOrmTransactionReader(repo),
      inject: [getRepositoryToken(TransactionOrmEntity)],
    },
    {
      provide: TransactionWriter,
      useFactory: (dataSource: DataSource) =>
        new TypeOrmTransactionWriter(dataSource, decrementManyLocked),
      inject: [getDataSourceToken()],
    },
    {
      provide: IdempotencyStore,
      useFactory: (repo: Repository<IdempotencyKeyOrmEntity>) =>
        new TypeOrmIdempotencyStore(repo),
      inject: [getRepositoryToken(IdempotencyKeyOrmEntity)],
    },
    {
      provide: SettlementPaymentGateway,
      useFactory: () =>
        new WompiHttpPaymentGateway(env.WOMPI_BASE_URL, env.WOMPI_PRIVATE_KEY),
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
  ],
  exports: [
    TransactionReader,
    TransactionWriter,
    IdempotencyStore,
    SettlementPaymentGateway,
    SettleProviderPaymentService,
    SettlementLogger,
  ],
})
export class SettlementModule {}
