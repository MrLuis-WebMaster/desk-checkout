import "reflect-metadata";
import { DataSource, type DataSourceOptions } from "typeorm";
import { env } from "#config/env.js";
import { InventoryOrmEntity } from "#modules/inventory/infrastructure/typeorm/inventory.orm-entity.js";
import { ProductOrmEntity } from "#modules/catalog/infrastructure/typeorm/product.orm-entity.js";
import { InitialCatalog1761270000000 } from "./migrations/1761270000000-InitialCatalog.js";
import { CatalogListIndexes1761271000000 } from "./migrations/1761271000000-CatalogListIndexes.js";
import { CheckoutData1790280000000 } from "./migrations/1790280000000-CheckoutData.js";
import { IdempotencyKeys1790290000000 } from "./migrations/1790290000000-IdempotencyKeys.js";
import { IdempotencyErrorCode1790300000000 } from "./migrations/1790300000000-IdempotencyErrorCode.js";
import { TransactionQuantity1790310000000 } from "./migrations/1790310000000-TransactionQuantity.js";
import { DeliveryCityOnly1790320000000 } from "./migrations/1790320000000-DeliveryCityOnly.js";
import { TransactionLineItems1790330000000 } from "./migrations/1790330000000-TransactionLineItems.js";
import { UniqueProviderTransactionId1790340000000 } from "./migrations/1790340000000-UniqueProviderTransactionId.js";
import { CheckoutSettingOrmEntity } from "#modules/shipping/infrastructure/typeorm/checkout-setting.orm-entity.js";
import { ShippingMethodOrmEntity } from "#modules/shipping/infrastructure/typeorm/shipping-method.orm-entity.js";
import { ShippingRateOrmEntity } from "#modules/shipping/infrastructure/typeorm/shipping-rate.orm-entity.js";
import { CustomerOrmEntity } from "@checkout/settlement-typeorm";
import { DeliveryOrmEntity } from "@checkout/settlement-typeorm";
import { TransactionOrmEntity } from "@checkout/settlement-typeorm";
import { IdempotencyKeyOrmEntity } from "@checkout/settlement-typeorm";

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
      IdempotencyKeyOrmEntity,
    ],
    migrations: [
      InitialCatalog1761270000000,
      CatalogListIndexes1761271000000,
      CheckoutData1790280000000,
      IdempotencyKeys1790290000000,
      IdempotencyErrorCode1790300000000,
      TransactionQuantity1790310000000,
      DeliveryCityOnly1790320000000,
      TransactionLineItems1790330000000,
      UniqueProviderTransactionId1790340000000,
    ],
  };
}

export const AppDataSource = new DataSource(buildDataSourceOptions());
