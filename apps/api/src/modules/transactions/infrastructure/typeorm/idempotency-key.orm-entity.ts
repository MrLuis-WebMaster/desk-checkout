import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";
import type { TransactionDto } from "@checkout/contracts";

@Entity({ name: "idempotency_keys" })
export class IdempotencyKeyOrmEntity {
  @PrimaryColumn({ type: "varchar", length: 200 })
  key!: string;

  @Column({ name: "transaction_id", type: "uuid" })
  transactionId!: string;

  @Column({ name: "request_hash", type: "varchar", length: 64 })
  requestHash!: string;

  @Column({ name: "response_json", type: "jsonb", nullable: true })
  responseJson!: TransactionDto | null;

  @Column({ name: "error_code", type: "varchar", length: 64, nullable: true })
  errorCode!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
