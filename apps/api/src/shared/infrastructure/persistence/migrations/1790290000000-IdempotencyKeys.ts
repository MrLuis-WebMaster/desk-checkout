import type { MigrationInterface, QueryRunner } from "typeorm";

export class IdempotencyKeys1790290000000 implements MigrationInterface {
  name = "IdempotencyKeys1790290000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "idempotency_keys" (
        "key" character varying(200) NOT NULL,
        "transaction_id" uuid NOT NULL,
        "request_hash" character varying(64) NOT NULL,
        "response_json" jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_idempotency_keys_key" PRIMARY KEY ("key")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "idempotency_keys"`);
  }
}
