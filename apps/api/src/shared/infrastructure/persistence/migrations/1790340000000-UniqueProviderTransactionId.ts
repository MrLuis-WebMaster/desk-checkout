import type { MigrationInterface, QueryRunner } from "typeorm";

export class UniqueProviderTransactionId1790340000000
  implements MigrationInterface
{
  name = "UniqueProviderTransactionId1790340000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_transactions_provider_transaction_id"
      ON "transactions" ("provider_transaction_id")
      WHERE "provider_transaction_id" IS NOT NULL
        AND "provider_transaction_id" NOT LIKE 'claim:%'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_transactions_provider_transaction_id"
    `);
  }
}
