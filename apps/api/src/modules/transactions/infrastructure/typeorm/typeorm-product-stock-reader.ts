import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProductOrmEntity } from "#modules/catalog/infrastructure/typeorm/product.orm-entity.js";
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
    const row = await this.products
      .createQueryBuilder("product")
      .leftJoin(
        "inventory",
        "inventory",
        "inventory.product_id = product.id",
      )
      .select([
        "product.id AS id",
        "product.name AS name",
        "product.price AS price",
        "COALESCE(inventory.available, 0) AS \"availableStock\"",
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
