import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProductOrmEntity } from "#modules/catalog/infrastructure/typeorm/product.orm-entity.js";
import {
  AVAILABLE_STOCK_COLUMN,
  joinAvailableStock,
} from "#modules/catalog/infrastructure/typeorm/product-stock.query.js";
import {
  ProductStockReader,
  type ProductStock,
} from "../../application/ports/product-stock-reader.port.js";

@Injectable()
export class TypeOrmProductStockReader extends ProductStockReader {
  constructor(
    @InjectRepository(ProductOrmEntity)
    private readonly products: Repository<ProductOrmEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<ProductStock | null> {
    const row = await joinAvailableStock(
      this.products.createQueryBuilder("product"),
    )
      .select([
        "product.id AS id",
        "product.name AS name",
        "product.price AS price",
        AVAILABLE_STOCK_COLUMN,
      ])
      .where("product.id = :id", { id })
      .getRawOne<{
        id: string;
        name: string;
        price: string | number;
        availableStock: string | number;
      }>();

    return row
      ? {
          id: row.id,
          name: row.name,
          price: Number(row.price),
          availableStock: Number(row.availableStock),
        }
      : null;
  }
}
