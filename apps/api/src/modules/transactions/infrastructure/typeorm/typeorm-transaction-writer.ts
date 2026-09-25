import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { TransactionStatus, type TransactionDto } from "@checkout/contracts";
import { DataSource, IsNull } from "typeorm";
import {
  TransactionWriter,
  type PaymentSettlement,
} from "../../application/ports/transaction-writer.port.js";
import type { Transaction } from "../../domain/transaction/transaction.js";
import { TypeOrmInventoryWriter } from "./typeorm-inventory-writer.js";
import { CustomerOrmEntity } from "./customer.orm-entity.js";
import { DeliveryOrmEntity } from "./delivery.orm-entity.js";
import { TransactionOrmEntity } from "./transaction.orm-entity.js";

@Injectable()
export class TypeOrmTransactionWriter extends TransactionWriter {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly inventory: TypeOrmInventoryWriter,
  ) {
    super();
  }

  async claimForPayment(transactionId: string): Promise<boolean> {
    const result = await this.dataSource.getRepository(TransactionOrmEntity).update(
      {
        id: transactionId,
        status: TransactionStatus.Pending,
        providerTransactionId: IsNull(),
      },
      { providerTransactionId: `claim:${transactionId}` },
    );
    return (result.affected ?? 0) === 1;
  }

  async releaseClaim(transactionId: string): Promise<void> {
    await this.dataSource.getRepository(TransactionOrmEntity).update(
      {
        id: transactionId,
        status: TransactionStatus.Pending,
        providerTransactionId: `claim:${transactionId}`,
      },
      { providerTransactionId: null },
    );
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
          providerTransactionId: transaction.providerTransactionId,
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

  async updateAfterPayment(
    transaction: Transaction,
    options: { decrementStock: boolean },
  ): Promise<PaymentSettlement> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager.update(
        TransactionOrmEntity,
        { id: transaction.id },
        {
          status: transaction.status,
          providerTransactionId: transaction.providerTransactionId,
        },
      );

      let stockDecremented = false;
      if (options.decrementStock) {
        stockDecremented = await this.inventory.decrementLocked(
          queryRunner.manager,
          transaction.productId,
          1,
        );
      }

      await queryRunner.commitTransaction();
      return {
        dto: toDto(transaction),
        stockDecremented,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

function toDto(transaction: Transaction) {
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
}
