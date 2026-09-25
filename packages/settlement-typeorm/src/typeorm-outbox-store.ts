import { DataSource, IsNull, type EntityManager } from "typeorm";
import { OutboxEventOrmEntity } from "./outbox-event.orm-entity.js";

export type OutboxClaim = {
  id: string;
  type: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  lockedUntil: Date;
};

const DEFAULT_LEASE_MS = 30_000;
const DEFAULT_RETRY_DELAY_MS = 5_000;

/**
 * Lease-based outbox claim/publish helpers. Keep Rabbit I/O outside the
 * claim transaction.
 */
export class TypeOrmOutboxStore {
  constructor(
    private readonly dataSource: DataSource,
    private readonly options: {
      leaseMs?: number;
      retryDelayMs?: number;
      now?: () => Date;
    } = {},
  ) {}

  private now(): Date {
    return this.options.now?.() ?? new Date();
  }

  async claimBatch(limit: number): Promise<OutboxClaim[]> {
    const leaseMs = this.options.leaseMs ?? DEFAULT_LEASE_MS;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const now = this.now();
      const rows = await queryRunner.manager
        .createQueryBuilder(OutboxEventOrmEntity, "outbox")
        .setLock("pessimistic_write")
        .setOnLocked("skip_locked")
        .where("outbox.published_at IS NULL")
        .andWhere(
          "(outbox.available_at IS NULL OR outbox.available_at <= :now)",
          { now },
        )
        .andWhere(
          "(outbox.locked_until IS NULL OR outbox.locked_until <= :now)",
          { now },
        )
        .orderBy("outbox.occurred_at", "ASC")
        .take(limit)
        .getMany();

      const lockedUntil = new Date(now.getTime() + leaseMs);
      const claimed: OutboxClaim[] = [];
      for (const row of rows) {
        row.lockedUntil = lockedUntil;
        row.attempts = (row.attempts ?? 0) + 1;
        await queryRunner.manager.save(row);
        claimed.push({
          id: row.id,
          type: row.type,
          aggregateId: row.aggregateId,
          payload: row.payload,
          lockedUntil,
        });
      }
      await queryRunner.commitTransaction();
      return claimed;
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async markPublished(id: string, lockedUntil: Date): Promise<boolean> {
    const result = await this.dataSource.getRepository(OutboxEventOrmEntity).update(
      {
        id,
        publishedAt: IsNull(),
        lockedUntil,
      },
      {
        publishedAt: this.now(),
        lockedUntil: null,
      },
    );
    return (result.affected ?? 0) === 1;
  }

  async releaseOnFailure(id: string, lockedUntil: Date): Promise<void> {
    const retryDelayMs = this.options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    const now = this.now();
    await this.dataSource.getRepository(OutboxEventOrmEntity).update(
      {
        id,
        publishedAt: IsNull(),
        lockedUntil,
      },
      {
        lockedUntil: null,
        availableAt: new Date(now.getTime() + retryDelayMs),
      },
    );
  }
}

/** Insert an outbox row inside an existing EntityManager transaction. */
export async function insertOutboxEvent(
  manager: EntityManager,
  input: {
    type: string;
    aggregateId: string;
    payload: Record<string, unknown>;
    occurredAt?: Date;
  },
): Promise<void> {
  await manager.save(
    manager.create(OutboxEventOrmEntity, {
      type: input.type,
      aggregateId: input.aggregateId,
      payload: input.payload,
      occurredAt: input.occurredAt ?? new Date(),
      publishedAt: null,
      attempts: 0,
      availableAt: null,
      lockedUntil: null,
    }),
  );
}
