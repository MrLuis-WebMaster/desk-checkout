import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductOrmEntity } from "#modules/catalog/infrastructure/typeorm/product.orm-entity.js";
import { ShippingModule } from "#modules/shipping/presentation/shipping.module.js";
import { ProductStockReader } from "../application/ports/product-stock-reader.port.js";
import { TransactionReader } from "../application/ports/transaction-reader.port.js";
import { TransactionWriter } from "../application/ports/transaction-writer.port.js";
import { CreateTransactionUseCase } from "../application/use-cases/create-transaction.use-case.js";
import { GetTransactionUseCase } from "../application/use-cases/get-transaction.use-case.js";
import { CustomerOrmEntity } from "../infrastructure/typeorm/customer.orm-entity.js";
import { DeliveryOrmEntity } from "../infrastructure/typeorm/delivery.orm-entity.js";
import { TransactionOrmEntity } from "../infrastructure/typeorm/transaction.orm-entity.js";
import { TypeOrmProductStockReader } from "../infrastructure/typeorm/typeorm-product-stock-reader.js";
import { TypeOrmTransactionReader } from "../infrastructure/typeorm/typeorm-transaction-reader.js";
import { TypeOrmTransactionWriter } from "../infrastructure/typeorm/typeorm-transaction-writer.js";
import { TransactionsController } from "./controllers/transactions.controller.js";

@Module({
  imports: [
    ShippingModule,
    TypeOrmModule.forFeature([
      ProductOrmEntity,
      CustomerOrmEntity,
      DeliveryOrmEntity,
      TransactionOrmEntity,
    ]),
  ],
  controllers: [TransactionsController],
  providers: [
    CreateTransactionUseCase,
    GetTransactionUseCase,
    { provide: ProductStockReader, useClass: TypeOrmProductStockReader },
    { provide: TransactionWriter, useClass: TypeOrmTransactionWriter },
    { provide: TransactionReader, useClass: TypeOrmTransactionReader },
  ],
})
export class TransactionsModule {}
