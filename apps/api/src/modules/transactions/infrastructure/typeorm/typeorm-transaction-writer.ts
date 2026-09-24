import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { TransactionDto } from "@checkout/contracts";
import { DataSource } from "typeorm";
import { TransactionWriter } from "../../application/ports/transaction-writer.port.js";
import type { Transaction } from "../../domain/transaction/transaction.js";
import { CustomerOrmEntity } from "./customer.orm-entity.js";
import { DeliveryOrmEntity } from "./delivery.orm-entity.js";
import { TransactionOrmEntity } from "./transaction.orm-entity.js";

@Injectable()
export class TypeOrmTransactionWriter extends TransactionWriter {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  async save(transaction: Transaction): Promise<TransactionDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const customer = await queryRunner.manager.save(
        queryRunner.manager.create(CustomerOrmEntity, transaction.customer),
      );
      const delivery = await queryRunner.manager.save(
        queryRunner.manager.create(DeliveryOrmEntity, transaction.delivery),
      );
      await queryRunner.manager.save(
        queryRunner.manager.create(TransactionOrmEntity, {
          id: transaction.id,
          productId: transaction.productId,
          customerId: customer.id,
          deliveryId: delivery.id,
          productName: transaction.productName,
          productPrice: transaction.productPrice.amount,
          baseFee: transaction.baseFee.amount,
          deliveryFee: transaction.deliveryFee.amount,
          total: transaction.total.amount,
          status: transaction.status,
          providerTransactionId: null,
          createdAt: transaction.createdAt,
        }),
      );
      await queryRunner.commitTransaction();

      return {
        id: transaction.id,
        status: transaction.status,
        productId: transaction.productId,
        productName: transaction.productName,
        productPrice: transaction.productPrice.amount,
        baseFee: transaction.baseFee.amount,
        deliveryFee: transaction.deliveryFee.amount,
        total: transaction.total.amount,
        customer: transaction.customer,
        delivery: transaction.delivery,
        createdAt: transaction.createdAt.toISOString(),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
