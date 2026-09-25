import type { MigrationInterface, QueryRunner } from "typeorm";

export class IdempotencyErrorCode1790300000000 implements MigrationInterface {
  name = "IdempotencyErrorCode1790300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "idempotency_keys"
      ADD COLUMN "error_code" character varying(64)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "idempotency_keys" DROP COLUMN "error_code"
    `);
  }
}
