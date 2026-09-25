import type { MigrationInterface, QueryRunner } from "typeorm";

export class DeliveryCityOnly1790320000000 implements MigrationInterface {
  name = "DeliveryCityOnly1790320000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "deliveries"
      SET "city" = "region_code"
      WHERE "region_code" IS NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "deliveries" DROP COLUMN "region_code"
    `);
    await queryRunner.query(`
      ALTER TABLE "deliveries" DROP COLUMN "postal_code"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "deliveries"
      ADD COLUMN "region_code" character varying(20) NOT NULL DEFAULT 'OTHER'
    `);
    await queryRunner.query(`
      ALTER TABLE "deliveries"
      ADD COLUMN "postal_code" character varying(20) NOT NULL DEFAULT ''
    `);
    await queryRunner.query(`
      UPDATE "deliveries"
      SET "region_code" = "city"
      WHERE "city" IN ('BOG', 'MED', 'CALI', 'OTHER')
    `);
  }
}
