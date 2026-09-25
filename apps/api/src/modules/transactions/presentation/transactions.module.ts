import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductOrmEntity } from "#modules/catalog/infrastructure/typeorm/product.orm-entity.js";
import { InventoryOrmEntity } from "#modules/inventory/infrastructure/typeorm/inventory.orm-entity.js";
import { PaymentsModule } from "#modules/payments/presentation/payments.module.js";
import { ShippingModule } from "#modules/shipping/presentation/shipping.module.js";
import { IdempotencyStore } from "../application/ports/idempotency-store.port.js";
import { InventoryWriter } from "../application/ports/inventory-writer.port.js";
import { ProductStockReader } from "../application/ports/product-stock-reader.port.js";
import { TransactionReader } from "../application/ports/transaction-reader.port.js";
import { TransactionWriter } from "../application/ports/transaction-writer.port.js";
import { CreateTransactionUseCase } from "../application/use-cases/create-transaction.use-case.js";
import { GetTransactionUseCase } from "../application/use-cases/get-transaction.use-case.js";
import { PayTransactionUseCase } from "../application/use-cases/pay-transaction.use-case.js";
import { CustomerOrmEntity } from "../infrastructure/typeorm/customer.orm-entity.js";
import { DeliveryOrmEntity } from "../infrastructure/typeorm/delivery.orm-entity.js";
import { IdempotencyKeyOrmEntity } from "../infrastructure/typeorm/idempotency-key.orm-entity.js";
import { TransactionOrmEntity } from "../infrastructure/typeorm/transaction.orm-entity.js";
import { TypeOrmIdempotencyStore } from "../infrastructure/typeorm/typeorm-idempotency-store.js";
import { TypeOrmInventoryWriter } from "../infrastructure/typeorm/typeorm-inventory-writer.js";
import { TypeOrmProductStockReader } from "../infrastructure/typeorm/typeorm-product-stock-reader.js";
import { TypeOrmTransactionReader } from "../infrastructure/typeorm/typeorm-transaction-reader.js";
import { TypeOrmTransactionWriter } from "../infrastructure/typeorm/typeorm-transaction-writer.js";
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
    PayTransactionUseCase,
    { provide: ProductStockReader, useClass: TypeOrmProductStockReader },
    { provide: TransactionWriter, useClass: TypeOrmTransactionWriter },
    { provide: TransactionReader, useClass: TypeOrmTransactionReader },
    TypeOrmInventoryWriter,
    { provide: IdempotencyStore, useClass: TypeOrmIdempotencyStore },
    { provide: InventoryWriter, useExisting: TypeOrmInventoryWriter },
  ],
})
export class TransactionsModule {}
