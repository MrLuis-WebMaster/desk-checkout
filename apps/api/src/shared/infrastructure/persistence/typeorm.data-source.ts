import "reflect-metadata";
import { DataSource, type DataSourceOptions } from "typeorm";
import { env } from "../../../config/env.js";
import { InventoryOrmEntity } from "#modules/inventory/infrastructure/typeorm/inventory.orm-entity.js";
import { ProductOrmEntity } from "#modules/catalog/infrastructure/typeorm/product.orm-entity.js";
import { InitialCatalog1761270000000 } from "./migrations/1761270000000-InitialCatalog.js";
import { CatalogListIndexes1761271000000 } from "./migrations/1761271000000-CatalogListIndexes.js";
import { CheckoutData1790280000000 } from "./migrations/1790280000000-CheckoutData.js";
import { CheckoutSettingOrmEntity } from "#modules/shipping/infrastructure/typeorm/checkout-setting.orm-entity.js";
import { ShippingMethodOrmEntity } from "#modules/shipping/infrastructure/typeorm/shipping-method.orm-entity.js";
import { ShippingRateOrmEntity } from "#modules/shipping/infrastructure/typeorm/shipping-rate.orm-entity.js";
import { CustomerOrmEntity } from "#modules/transactions/infrastructure/typeorm/customer.orm-entity.js";
import { DeliveryOrmEntity } from "#modules/transactions/infrastructure/typeorm/delivery.orm-entity.js";
import { TransactionOrmEntity } from "#modules/transactions/infrastructure/typeorm/transaction.orm-entity.js";

export function buildDataSourceOptions(): DataSourceOptions {
  return {
    type: "postgres",
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    synchronize: false,
    logging: false,
    entities: [
      ProductOrmEntity,
      InventoryOrmEntity,
      CheckoutSettingOrmEntity,
      ShippingMethodOrmEntity,
      ShippingRateOrmEntity,
      CustomerOrmEntity,
      DeliveryOrmEntity,
      TransactionOrmEntity,
    ],
    migrations: [
      InitialCatalog1761270000000,
      CatalogListIndexes1761271000000,
      CheckoutData1790280000000,
    ],
  };
}

export const AppDataSource = new DataSource(buildDataSourceOptions());
