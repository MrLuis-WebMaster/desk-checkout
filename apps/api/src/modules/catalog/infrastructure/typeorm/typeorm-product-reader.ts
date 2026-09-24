import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type {
  ProductDto,
  ProductPageDto,
  ProductSummaryDto,
} from "@checkout/contracts";
import { Repository, type SelectQueryBuilder } from "typeorm";
import {
  decodeProductCursor,
  encodeProductCursor,
  type ProductCursorPayload,
  type ProductOrder,
  type ProductSort,
} from "../../application/queries/product-cursor.js";
import {
  ProductReader,
  type ListProductsQuery,
} from "../../application/ports/product-reader.port.js";
import { ProductOrmEntity } from "./product.orm-entity.js";

const LIKE_ESCAPE = "\\";

function escapeLike(value: string): string {
  return value
    .replaceAll(LIKE_ESCAPE, LIKE_ESCAPE + LIKE_ESCAPE)
    .replaceAll("%", LIKE_ESCAPE + "%")
    .replaceAll("_", LIKE_ESCAPE + "_");
}

type ProductListRow = {
  id: string;
  name: string;
  price: string | number;
  imageUrl: string;
  availableStock: string | number;
};

@Injectable()
export class TypeOrmProductReader extends ProductReader {
  constructor(
    @InjectRepository(ProductOrmEntity)
    private readonly products: Repository<ProductOrmEntity>,
  ) {
    super();
  }

  async list(query: ListProductsQuery): Promise<ProductPageDto> {
    const goingBackward = Boolean(query.before);
    const cursorRaw = query.before ?? query.after;
    const cursor = cursorRaw ? decodeProductCursor(cursorRaw) : null;
    const pageNumber = cursor ? 1 : (query.page ?? 1);

    const countQb = this.products.createQueryBuilder("product");
    this.applyNameFilter(countQb, query.q);

    const pageQb = this.products
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
        "product.image_url AS \"imageUrl\"",
        "COALESCE(inventory.available, 0) AS \"availableStock\"",
      ]);

    this.applyNameFilter(pageQb, query.q);

    const effectiveOrder: ProductOrder = goingBackward
      ? invertOrder(query.order)
      : query.order;

    if (cursor) {
      this.applyKeyset(pageQb, cursor, query.sort, effectiveOrder);
    }

    this.applyOrdering(pageQb, query.sort, effectiveOrder);
    if (!cursor && pageNumber > 1) {
      pageQb.offset((pageNumber - 1) * query.pageSize);
    }
    pageQb.limit(query.pageSize + 1);

    const [total, rows] = await Promise.all([
      countQb.getCount(),
      pageQb.getRawMany<ProductListRow>(),
    ]);

    const hasExtra = rows.length > query.pageSize;
    let pageRows = hasExtra ? rows.slice(0, query.pageSize) : rows;
    if (goingBackward) {
      pageRows = pageRows.reverse();
    }

    const items = pageRows.map(mapSummaryRow);

    const nextCursor =
      items.length > 0 && (goingBackward || hasExtra)
        ? cursorFromItem(items[items.length - 1], query.sort, query.order)
        : null;
    const prevCursor =
      items.length > 0 &&
      ((goingBackward && hasExtra) ||
        (!goingBackward && Boolean(query.after)) ||
        (!cursor && pageNumber > 1))
        ? cursorFromItem(items[0], query.sort, query.order)
        : null;

    return {
      items,
      pageSize: query.pageSize,
      total,
      nextCursor,
      prevCursor,
    };
  }

  async findById(id: string): Promise<ProductDto | null> {
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
        "product.description AS description",
        "product.price AS price",
        "product.image_url AS \"imageUrl\"",
        "COALESCE(inventory.available, 0) AS \"availableStock\"",
      ])
      .where("product.id = :id", { id })
      .getRawOne<{
        id: string;
        name: string;
        description: string;
        price: string | number;
        imageUrl: string;
        availableStock: string | number;
      }>();

    return row ? mapDetailRow(row) : null;
  }

  private applyNameFilter(
    qb: SelectQueryBuilder<ProductOrmEntity>,
    q: string | undefined,
  ): void {
    if (!q) {
      return;
    }
    qb.andWhere("product.name ILIKE :q ESCAPE :escape", {
      q: `%${escapeLike(q)}%`,
      escape: LIKE_ESCAPE,
    });
  }

  private applyOrdering(
    qb: SelectQueryBuilder<ProductOrmEntity>,
    sort: ProductSort,
    order: ProductOrder,
  ): void {
    const direction = order === "desc" ? "DESC" : "ASC";
    const sortColumn = sort === "price" ? "product.price" : "product.name";
    qb.orderBy(sortColumn, direction).addOrderBy("product.id", direction);
  }

  private applyKeyset(
    qb: SelectQueryBuilder<ProductOrmEntity>,
    cursor: ProductCursorPayload,
    sort: ProductSort,
    order: ProductOrder,
  ): void {
    const comparator = order === "asc" ? ">" : "<";
    if (sort === "price") {
      qb.andWhere(
        `(product.price, product.id) ${comparator} (:cursorPrice, :cursorId)`,
        { cursorPrice: cursor.price, cursorId: cursor.id },
      );
      return;
    }
    qb.andWhere(
      `(product.name, product.id) ${comparator} (:cursorName, :cursorId)`,
      { cursorName: cursor.name, cursorId: cursor.id },
    );
  }
}

function invertOrder(order: ProductOrder): ProductOrder {
  return order === "asc" ? "desc" : "asc";
}

function cursorFromItem(
  item: ProductSummaryDto | undefined,
  sort: ProductSort,
  order: ProductOrder,
): string | null {
  if (!item) {
    return null;
  }
  return encodeProductCursor({
    sort,
    order,
    name: item.name,
    price: item.price,
    id: item.id,
  });
}

function mapSummaryRow(row: ProductListRow): ProductSummaryDto {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    imageUrl: row.imageUrl,
    availableStock: Number(row.availableStock),
  };
}

function mapDetailRow(row: {
  id: string;
  name: string;
  description: string;
  price: string | number;
  imageUrl: string;
  availableStock: string | number;
}): ProductDto {
  return {
    ...mapSummaryRow(row),
    description: row.description,
  };
}
