import { TransactionStatus, type TransactionDto } from "@checkout/contracts";
import {
  Transaction as TransactionAggregate,
  TransactionWriter,
  type PaymentSettlement,
  type Transaction,
} from "@checkout/settlement";
import { DataSource, EntityManager, IsNull } from "typeorm";
import { toTransactionDto } from "./transaction-dto.mapper.js";
import { CustomerOrmEntity } from "./customer.orm-entity.js";
import { DeliveryOrmEntity } from "./delivery.orm-entity.js";
import { TransactionOrmEntity } from "./transaction.orm-entity.js";

export type StockDecrementer = (
  manager: EntityManager,
  lines: Array<{ productId: string; quantity: number }>,
) => Promise<boolean>;

/** Nest-free TypeORM transaction writer. Wire via Nest factory in apps. */
export class TypeOrmTransactionWriter extends TransactionWriter {
  constructor(
    private readonly dataSource: DataSource,
    private readonly stockDecrementer: StockDecrementer,
  ) {
    super();
  }

  async claimForPayment(transactionId: string): Promise<boolean> {
    const claimedAt = new Date();
    const result = await this.dataSource
      .getRepository(TransactionOrmEntity)
      .update(
        {
          id: transactionId,
          status: TransactionStatus.Pending,
          providerTransactionId: IsNull(),
        },
        {
          providerTransactionId: `claim:${transactionId}`,
          updatedAt: claimedAt,
        },
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
      { providerTransactionId: null, updatedAt: new Date() },
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
      { providerTransactionId, updatedAt: new Date() },
    );
  }

  async expireUncharged(
    transaction: Transaction,
    options: { claimLeaseBefore: Date },
  ): Promise<boolean> {
    const result = await this.dataSource
      .createQueryBuilder()
      .update(TransactionOrmEntity)
      .set({
        status: transaction.status,
        providerTransactionId: transaction.providerTransactionId,
        updatedAt: new Date(),
      })
      .where("id = :id", { id: transaction.id })
      .andWhere("status = :status", { status: TransactionStatus.Pending })
      .andWhere(
        `(provider_transaction_id IS NULL OR (
          provider_transaction_id LIKE :claimPrefix
          AND updated_at < :claimLeaseBefore
        ))`,
        {
          claimPrefix: "claim:%",
          claimLeaseBefore: options.claimLeaseBefore,
        },
      )
      .execute();
    return (result.affected ?? 0) === 1;
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

      if (row.status !== TransactionStatus.Pending) {
        if (row.providerTransactionId !== transaction.providerTransactionId) {
          throw new Error("Transaction provider id mismatch on settlement");
        }
        await queryRunner.commitTransaction();
        return {
          dto: toTransactionDto(
            withPersistedSettlement(
              transaction,
              row.status,
              row.providerTransactionId,
            ),
          ),
          stockDecremented: row.status === TransactionStatus.Approved,
        };
      }

      let toPersist = transaction;
      let stockDecremented = false;

      if (
        options.decrementStock &&
        transaction.status === TransactionStatus.Approved
      ) {
        stockDecremented = await this.stockDecrementer(
          queryRunner.manager,
          transaction.lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
          })),
        );
        if (!stockDecremented) {
          toPersist = transaction.markSettlementError();
        }
      }

      const cas = await queryRunner.manager.update(
        TransactionOrmEntity,
        {
          id: transaction.id,
          status: TransactionStatus.Pending,
        },
        {
          status: toPersist.status,
          providerTransactionId: toPersist.providerTransactionId,
        },
      );

      if ((cas.affected ?? 0) !== 1) {
        // Another writer won. Roll back any stock decrements from this attempt
        // so we never double-decrement or leave orphan stock moves.
        await queryRunner.rollbackTransaction();
        const winner = await this.dataSource
          .getRepository(TransactionOrmEntity)
          .findOne({ where: { id: transaction.id } });
        if (!winner) {
          throw new Error(`Transaction ${transaction.id} not found`);
        }
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

      await queryRunner.commitTransaction();
      return {
        dto: toTransactionDto(toPersist),
        stockDecremented,
      };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
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
