import type { MigrationInterface, QueryRunner } from "typeorm";

export class CheckoutData1790280000000 implements MigrationInterface {
  name = "CheckoutData1790280000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "checkout_settings" (
        "key" character varying(100) NOT NULL,
        "value_cents" integer NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_checkout_settings_key" PRIMARY KEY ("key")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "shipping_methods" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "code" character varying(50) NOT NULL,
        "name" character varying(120) NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_shipping_methods_code" UNIQUE ("code"),
        CONSTRAINT "PK_shipping_methods_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "shipping_rates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "shipping_method_id" uuid NOT NULL,
        "region_code" character varying(20) NOT NULL,
        "amount_cents" integer NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_shipping_rates_method_region"
          UNIQUE ("shipping_method_id", "region_code"),
        CONSTRAINT "PK_shipping_rates_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_shipping_rates_method_id"
          FOREIGN KEY ("shipping_method_id") REFERENCES "shipping_methods"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "customers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "full_name" character varying(200) NOT NULL,
        "email" character varying(320) NOT NULL,
        "phone" character varying(30) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_customers_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "deliveries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "shipping_method_id" uuid NOT NULL,
        "address_line" character varying(300) NOT NULL,
        "city" character varying(120) NOT NULL,
        "region_code" character varying(20) NOT NULL,
        "postal_code" character varying(20) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_deliveries_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_deliveries_shipping_method_id"
          FOREIGN KEY ("shipping_method_id") REFERENCES "shipping_methods"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "product_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "delivery_id" uuid NOT NULL,
        "product_name" character varying(200) NOT NULL,
        "product_price" integer NOT NULL,
        "base_fee" integer NOT NULL,
        "delivery_fee" integer NOT NULL,
        "total" integer NOT NULL,
        "status" character varying(30) NOT NULL,
        "provider_transaction_id" character varying(200),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transactions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_transactions_product_id"
          FOREIGN KEY ("product_id") REFERENCES "products"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_transactions_customer_id"
          FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_transactions_delivery_id"
          FOREIGN KEY ("delivery_id") REFERENCES "deliveries"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP TABLE "deliveries"`);
    await queryRunner.query(`DROP TABLE "customers"`);
    await queryRunner.query(`DROP TABLE "shipping_rates"`);
    await queryRunner.query(`DROP TABLE "shipping_methods"`);
    await queryRunner.query(`DROP TABLE "checkout_settings"`);
  }
}
