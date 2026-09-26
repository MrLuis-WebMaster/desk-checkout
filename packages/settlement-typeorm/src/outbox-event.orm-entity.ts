import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "outbox_events" })
@Index("IDX_outbox_events_unpublished", ["publishedAt"], {
  where: '"published_at" IS NULL',
})
export class OutboxEventOrmEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100 })
  type!: string;

  @Column({ name: "aggregate_id", type: "uuid" })
  aggregateId!: string;

  @Column({ type: "jsonb" })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: "occurred_at", type: "timestamptz" })
  occurredAt!: Date;

  @Column({ name: "published_at", type: "timestamptz", nullable: true })
  publishedAt!: Date | null;

  @Column({ type: "integer", default: 0 })
  attempts!: number;

  @Column({ name: "available_at", type: "timestamptz", nullable: true })
  availableAt!: Date | null;

  @Column({ name: "locked_until", type: "timestamptz", nullable: true })
  lockedUntil!: Date | null;
}
