import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { TransactionStatus } from "@checkout/contracts";

@Entity({ name: "transactions" })
@Index("UQ_transactions_provider_transaction_id", ["providerTransactionId"], {
  unique: true,
  where:
    "\"provider_transaction_id\" IS NOT NULL AND \"provider_transaction_id\" NOT LIKE 'claim:%'",
})
export class TransactionOrmEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "product_id", type: "uuid" })
  productId!: string;

  @Column({ name: "customer_id", type: "uuid" })
  customerId!: string;

  @Column({ name: "delivery_id", type: "uuid" })
  deliveryId!: string;

  @Column({ name: "product_name", type: "varchar", length: 200 })
  productName!: string;

  @Column({ name: "product_price", type: "integer" })
  productPrice!: number;

  @Column({ type: "integer", default: 1 })
  quantity!: number;

  @Column({ name: "line_items", type: "jsonb" })
  lineItems!: Array<{
    productId: string;
    productName: string;
    productPrice: number;
    quantity: number;
  }>;

  @Column({ name: "base_fee", type: "integer" })
  baseFee!: number;

  @Column({ name: "delivery_fee", type: "integer" })
  deliveryFee!: number;

  @Column({ type: "integer" })
  total!: number;

  @Column({ type: "varchar", length: 30 })
  status!: TransactionStatus;

  @Column({
    name: "provider_transaction_id",
    type: "varchar",
    length: 200,
    nullable: true,
  })
  providerTransactionId!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
