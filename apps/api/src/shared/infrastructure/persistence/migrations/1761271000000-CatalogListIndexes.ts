import type { MigrationInterface, QueryRunner } from "typeorm";

export class CatalogListIndexes1761271000000 implements MigrationInterface {
  name = "CatalogListIndexes1761271000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await queryRunner.query(`
      CREATE INDEX "IDX_products_name_trgm"
      ON "products" USING gin ("name" gin_trgm_ops)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_products_price_id"
      ON "products" ("price", "id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_products_name_id"
      ON "products" ("name", "id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_name_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_price_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_name_trgm"`);
  }
}
