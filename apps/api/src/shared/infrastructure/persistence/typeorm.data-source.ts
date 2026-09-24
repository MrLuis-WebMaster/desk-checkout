import "reflect-metadata";
import { DataSource, type DataSourceOptions } from "typeorm";
import { env } from "../../../config/env.js";
import { InventoryOrmEntity } from "#modules/inventory/infrastructure/typeorm/inventory.orm-entity.js";
import { ProductOrmEntity } from "#modules/catalog/infrastructure/typeorm/product.orm-entity.js";
import { InitialCatalog1761270000000 } from "./migrations/1761270000000-InitialCatalog.js";
import { CatalogListIndexes1761271000000 } from "./migrations/1761271000000-CatalogListIndexes.js";

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
    entities: [ProductOrmEntity, InventoryOrmEntity],
    migrations: [InitialCatalog1761270000000, CatalogListIndexes1761271000000],
  };
}

export const AppDataSource = new DataSource(buildDataSourceOptions());
