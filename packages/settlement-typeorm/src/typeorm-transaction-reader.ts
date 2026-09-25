import type {
  ShippingCityCode,
  TransactionDto,
  TransactionLineDto,
} from "@checkout/contracts";
import { TransactionStatus } from "@checkout/contracts";
import { Money, Transaction, TransactionReader } from "@checkout/settlement";
import { Repository } from "typeorm";
import { toTransactionDto } from "./transaction-dto.mapper.js";
import { TransactionOrmEntity } from "./transaction.orm-entity.js";

type TransactionRow = {
  id: string;
  status: TransactionStatus;
  productId: string;
  productName: string;
  productPrice: string | number;
  quantity: string | number;
  lineItems: TransactionLineDto[] | string | null;
  baseFee: string | number;
  deliveryFee: string | number;
  total: string | number;
  fullName: string;
  email: string;
  phone: string;
  shippingMethodId: string;
  addressLine: string;
  city: ShippingCityCode;
  createdAt: Date;
  providerTransactionId: string | null;
};

/** Nest-free TypeORM transaction reader. Wire via Nest factory in apps. */
export class TypeOrmTransactionReader extends TransactionReader {
  constructor(
    private readonly transactions: Repository<TransactionOrmEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<TransactionDto | null> {
    const aggregate = await this.findAggregateById(id);
    return aggregate ? toTransactionDto(aggregate) : null;
  }

  async findAggregateById(id: string): Promise<Transaction | null> {
    const row = await this.loadRowById(id);
    return row ? toAggregate(row) : null;
  }

  async findAggregateByProviderId(
    providerTransactionId: string,
  ): Promise<Transaction | null> {
    const row = await this.baseQuery()
      .where("transaction.provider_transaction_id = :providerTransactionId", {
        providerTransactionId,
      })
      .getRawOne<TransactionRow>();
    return row ? toAggregate(row) : null;
  }

  async listStuckPending(olderThan: Date): Promise<Transaction[]> {
    const rows = await this.baseQuery()
      .where("transaction.status = :status", {
        status: TransactionStatus.Pending,
      })
      .andWhere("transaction.provider_transaction_id IS NOT NULL")
      .andWhere("transaction.provider_transaction_id NOT LIKE 'claim:%'")
      .andWhere("transaction.created_at < :olderThan", { olderThan })
      .getRawMany<TransactionRow>();
    return rows.map(toAggregate);
  }

  async listOrphanPending(
    olderThan: Date,
    options: { claimLeaseBefore: Date },
  ): Promise<Transaction[]> {
    const rows = await this.baseQuery()
      .where("transaction.status = :status", {
        status: TransactionStatus.Pending,
      })
      .andWhere(
        `(
          (transaction.provider_transaction_id IS NULL AND transaction.created_at < :olderThan)
          OR (
            transaction.provider_transaction_id LIKE :claimPrefix
            AND transaction.updated_at < :claimLeaseBefore
          )
        )`,
        {
          olderThan,
          claimPrefix: "claim:%",
          claimLeaseBefore: options.claimLeaseBefore,
        },
      )
      .getRawMany<TransactionRow>();
    return rows.map(toAggregate);
  }

  private loadRowById(id: string): Promise<TransactionRow | undefined> {
    return this.baseQuery()
      .where("transaction.id = :id", { id })
      .getRawOne<TransactionRow>();
  }

  private baseQuery() {
    return this.transactions
      .createQueryBuilder("transaction")
      .innerJoin(
        "customers",
        "customer",
        "customer.id = transaction.customer_id",
      )
      .innerJoin(
        "deliveries",
        "delivery",
        "delivery.id = transaction.delivery_id",
      )
      .select([
        "transaction.id AS id",
        "transaction.status AS status",
        'transaction.product_id AS "productId"',
        'transaction.product_name AS "productName"',
        'transaction.product_price AS "productPrice"',
        "transaction.quantity AS quantity",
        'transaction.line_items AS "lineItems"',
        'transaction.base_fee AS "baseFee"',
        'transaction.delivery_fee AS "deliveryFee"',
        "transaction.total AS total",
        'customer.full_name AS "fullName"',
        "customer.email AS email",
        "customer.phone AS phone",
        'delivery.shipping_method_id AS "shippingMethodId"',
        'delivery.address_line AS "addressLine"',
        "delivery.city AS city",
        'transaction.created_at AS "createdAt"',
        'transaction.provider_transaction_id AS "providerTransactionId"',
      ]);
  }
}

function toAggregate(row: TransactionRow): Transaction {
  const lines = resolveLines(row);
  return Transaction.rehydrate({
    id: row.id,
    status: row.status,
    lines: lines.map((line) => ({
      productId: line.productId,
      productName: line.productName,
      productPrice: Money.create(line.productPrice),
      quantity: line.quantity,
    })),
    baseFee: Money.create(Number(row.baseFee)),
    deliveryFee: Money.create(Number(row.deliveryFee)),
    total: Money.create(Number(row.total)),
    customer: {
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
    },
    delivery: {
      shippingMethodId: row.shippingMethodId,
      addressLine: row.addressLine,
      city: row.city,
    },
    createdAt: new Date(row.createdAt),
    providerTransactionId: row.providerTransactionId,
  });
}

function parseLineItems(
  raw: TransactionRow["lineItems"],
): TransactionLineDto[] | null {
  if (raw == null) {
    return null;
  }
  const value =
    typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }
  return value.map((item) => ({
    productId: String(item.productId),
    productName: String(item.productName),
    productPrice: Number(item.productPrice),
    quantity: Number(item.quantity),
  }));
}

function resolveLines(row: TransactionRow): TransactionLineDto[] {
  return (
    parseLineItems(row.lineItems) ?? [
      {
        productId: row.productId,
        productName: row.productName,
        productPrice: Number(row.productPrice),
        quantity: Number(row.quantity),
      },
    ]
  );
}
