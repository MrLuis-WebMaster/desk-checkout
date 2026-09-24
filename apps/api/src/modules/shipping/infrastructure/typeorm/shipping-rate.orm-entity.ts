import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import type { ShippingRegionCode } from "@checkout/contracts";

@Entity({ name: "shipping_rates" })
@Unique("UQ_shipping_rates_method_region", [
  "shippingMethodId",
  "regionCode",
])
export class ShippingRateOrmEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "shipping_method_id", type: "uuid" })
  shippingMethodId!: string;

  @Column({ name: "region_code", type: "varchar", length: 20 })
  regionCode!: ShippingRegionCode;

  @Column({ name: "amount_cents", type: "integer" })
  amountCents!: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
