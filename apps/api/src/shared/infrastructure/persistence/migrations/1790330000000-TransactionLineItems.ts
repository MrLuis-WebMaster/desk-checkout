import type { MigrationInterface, QueryRunner } from "typeorm";

export class TransactionLineItems1790330000000 implements MigrationInterface {
  name = "TransactionLineItems1790330000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD COLUMN "line_items" jsonb
    `);
    await queryRunner.query(`
      UPDATE "transactions"
      SET "line_items" = jsonb_build_array(
        jsonb_build_object(
          'productId', "product_id",
          'productName', "product_name",
          'productPrice', "product_price",
          'quantity', COALESCE("quantity", 1)
        )
      )
      WHERE "line_items" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ALTER COLUMN "line_items" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transactions" DROP COLUMN "line_items"
    `);
  }
}
