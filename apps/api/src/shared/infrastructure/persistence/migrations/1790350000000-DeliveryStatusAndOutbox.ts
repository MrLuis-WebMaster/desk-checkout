import type { MigrationInterface, QueryRunner } from "typeorm";

export class DeliveryStatusAndOutbox1790350000000
  implements MigrationInterface
{
  name = "DeliveryStatusAndOutbox1790350000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "deliveries"
      ADD COLUMN "status" varchar(20)
    `);

    // Backfill from existing terminal transactions before enforcing NOT NULL.
    await queryRunner.query(`
      UPDATE "deliveries" AS d
      SET "status" = 'READY'
      FROM "transactions" AS t
      WHERE t."delivery_id" = d."id"
        AND t."status" = 'APPROVED'
    `);

    await queryRunner.query(`
      UPDATE "deliveries" AS d
      SET "status" = 'CANCELLED'
      FROM "transactions" AS t
      WHERE t."delivery_id" = d."id"
        AND t."status" IN ('DECLINED', 'ERROR', 'EXPIRED')
    `);

    await queryRunner.query(`
      UPDATE "deliveries"
      SET "status" = 'PENDING'
      WHERE "status" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "deliveries"
      ALTER COLUMN "status" SET DEFAULT 'PENDING',
      ALTER COLUMN "status" SET NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "outbox_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "type" varchar(100) NOT NULL,
        "aggregate_id" uuid NOT NULL,
        "payload" jsonb NOT NULL,
        "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "published_at" TIMESTAMPTZ,
        "attempts" integer NOT NULL DEFAULT 0,
        "available_at" TIMESTAMPTZ,
        "locked_until" TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_outbox_events_unpublished"
      ON "outbox_events" ("published_at")
      WHERE "published_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_outbox_events_unpublished"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "outbox_events"`);
    await queryRunner.query(
      `ALTER TABLE "deliveries" DROP COLUMN IF EXISTS "status"`,
    );
  }
}
