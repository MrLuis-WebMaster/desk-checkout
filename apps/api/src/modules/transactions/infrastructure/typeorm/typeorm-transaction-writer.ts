import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { TransactionStatus, type TransactionDto } from "@checkout/contracts";
import { DataSource, IsNull } from "typeorm";
import { toTransactionDto } from "../../application/mappers/transaction-dto.mapper.js";
import { InventoryWriter } from "../../application/ports/inventory-writer.port.js";
import {
  TransactionWriter,
  type PaymentSettlement,
} from "../../application/ports/transaction-writer.port.js";
import {
  Transaction as TransactionAggregate,
  type Transaction,
} from "../../domain/transaction/transaction.js";
import { CustomerOrmEntity } from "./customer.orm-entity.js";
import { DeliveryOrmEntity } from "./delivery.orm-entity.js";
import { TransactionOrmEntity } from "./transaction.orm-entity.js";

@Injectable()
export class TypeOrmTransactionWriter extends TransactionWriter {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly inventory: InventoryWriter,
  ) {
    super();
  }

  async claimForPayment(transactionId: string): Promise<boolean> {
    const result = await this.dataSource
      .getRepository(TransactionOrmEntity)
      .update(
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

  async attachProviderTransactionId(
    transactionId: string,
    providerTransactionId: string,
  ): Promise<void> {
    await this.dataSource.getRepository(TransactionOrmEntity).update(
      {
        id: transactionId,
        status: TransactionStatus.Pending,
        providerTransactionId: `claim:${transactionId}`,
      },
      { providerTransactionId },
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
      const lineItems = transaction.lines.map((line) => ({
        productId: line.productId,
        productName: line.productName,
        productPrice: line.productPrice.amount,
        quantity: line.quantity,
      }));
      await queryRunner.manager.save(
        queryRunner.manager.create(TransactionOrmEntity, {
          id: transaction.id,
          productId: transaction.productId,
          customerId: customer.id,
          deliveryId: delivery.id,
          productName: transaction.productName,
          productPrice: transaction.productPrice.amount,
          quantity: transaction.quantity,
          lineItems,
          baseFee: transaction.baseFee.amount,
          deliveryFee: transaction.deliveryFee.amount,
          total: transaction.total.amount,
          status: transaction.status,
          providerTransactionId: transaction.providerTransactionId,
          createdAt: transaction.createdAt,
        }),
      );
      await queryRunner.commitTransaction();
      return toTransactionDto(transaction);
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
      const row = await queryRunner.manager
        .createQueryBuilder(TransactionOrmEntity, "transaction")
        .setLock("pessimistic_write")
        .where("transaction.id = :id", { id: transaction.id })
        .getOne();

      if (!row) {
        throw new Error(`Transaction ${transaction.id} not found`);
      }

      // Another writer already settled this pending charge — do not decrement again.
      if (row.status !== TransactionStatus.Pending) {
        if (row.providerTransactionId !== transaction.providerTransactionId) {
          throw new Error("Transaction provider id mismatch on settlement");
        }
        await queryRunner.commitTransaction();
        return {
          dto: toTransactionDto(
            withPersistedSettlement(transaction, row.status, row.providerTransactionId),
          ),
          stockDecremented: row.status === TransactionStatus.Approved,
        };
      }

      let finalStatus = transaction.status;
      let stockDecremented = false;

      if (
        options.decrementStock &&
        transaction.status === TransactionStatus.Approved
      ) {
        stockDecremented = await this.inventory.decrementManyLocked(
          queryRunner.manager,
          transaction.lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
          })),
        );
        if (!stockDecremented) {
          // Customer may be charged; persist recoverable Error, never Approved without stock.
          finalStatus = TransactionStatus.Error;
        }
      }

      const cas = await queryRunner.manager.update(
        TransactionOrmEntity,
        {
          id: transaction.id,
          status: TransactionStatus.Pending,
        },
        {
          status: finalStatus,
          providerTransactionId: transaction.providerTransactionId,
        },
      );

      if ((cas.affected ?? 0) !== 1) {
        const winner = await queryRunner.manager.findOne(TransactionOrmEntity, {
          where: { id: transaction.id },
        });
        if (!winner) {
          throw new Error(`Transaction ${transaction.id} not found`);
        }
        await queryRunner.commitTransaction();
        return {
          dto: toTransactionDto(
            withPersistedSettlement(
              transaction,
              winner.status,
              winner.providerTransactionId,
            ),
          ),
          stockDecremented: winner.status === TransactionStatus.Approved,
        };
      }

      const persisted = withPersistedSettlement(
        transaction,
        finalStatus,
        transaction.providerTransactionId,
      );

      await queryRunner.commitTransaction();
      return {
        dto: toTransactionDto(persisted),
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

function withPersistedSettlement(
  transaction: Transaction,
  status: TransactionStatus,
  providerTransactionId: string | null,
): Transaction {
  return TransactionAggregate.rehydrate({
    id: transaction.id,
    status,
    lines: transaction.lines,
    baseFee: transaction.baseFee,
    deliveryFee: transaction.deliveryFee,
    total: transaction.total,
    customer: transaction.customer,
    delivery: transaction.delivery,
    createdAt: transaction.createdAt,
    providerTransactionId,
  });
}
