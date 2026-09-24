import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type {
  ShippingRegionCode,
  TransactionDto,
} from "@checkout/contracts";
import { TransactionStatus } from "@checkout/contracts";
import { Repository } from "typeorm";
import { TransactionReader } from "../../application/ports/transaction-reader.port.js";
import { TransactionOrmEntity } from "./transaction.orm-entity.js";

type TransactionRow = {
  id: string;
  status: TransactionStatus;
  productId: string;
  productName: string;
  productPrice: string | number;
  baseFee: string | number;
  deliveryFee: string | number;
  total: string | number;
  fullName: string;
  email: string;
  phone: string;
  shippingMethodId: string;
  addressLine: string;
  city: string;
  regionCode: ShippingRegionCode;
  postalCode: string;
  createdAt: Date;
};

@Injectable()
export class TypeOrmTransactionReader extends TransactionReader {
  constructor(
    @InjectRepository(TransactionOrmEntity)
    private readonly transactions: Repository<TransactionOrmEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<TransactionDto | null> {
    const row = await this.transactions
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
        "transaction.product_id AS \"productId\"",
        "transaction.product_name AS \"productName\"",
        "transaction.product_price AS \"productPrice\"",
        "transaction.base_fee AS \"baseFee\"",
        "transaction.delivery_fee AS \"deliveryFee\"",
        "transaction.total AS total",
        "customer.full_name AS \"fullName\"",
        "customer.email AS email",
        "customer.phone AS phone",
        "delivery.shipping_method_id AS \"shippingMethodId\"",
        "delivery.address_line AS \"addressLine\"",
        "delivery.city AS city",
        "delivery.region_code AS \"regionCode\"",
        "delivery.postal_code AS \"postalCode\"",
        "transaction.created_at AS \"createdAt\"",
      ])
      .where("transaction.id = :id", { id })
      .getRawOne<TransactionRow>();

    return row
      ? {
          id: row.id,
          status: row.status,
          productId: row.productId,
          productName: row.productName,
          productPrice: Number(row.productPrice),
          baseFee: Number(row.baseFee),
          deliveryFee: Number(row.deliveryFee),
          total: Number(row.total),
          customer: {
            fullName: row.fullName,
            email: row.email,
            phone: row.phone,
          },
          delivery: {
            shippingMethodId: row.shippingMethodId,
            addressLine: row.addressLine,
            city: row.city,
            regionCode: row.regionCode,
            postalCode: row.postalCode,
          },
          createdAt: new Date(row.createdAt).toISOString(),
        }
      : null;
  }
}
