import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { ShippingRegionCode } from "@checkout/contracts";

@Entity({ name: "deliveries" })
export class DeliveryOrmEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "shipping_method_id", type: "uuid" })
  shippingMethodId!: string;

  @Column({ name: "address_line", type: "varchar", length: 300 })
  addressLine!: string;

  @Column({ type: "varchar", length: 120 })
  city!: string;

  @Column({ name: "region_code", type: "varchar", length: 20 })
  regionCode!: ShippingRegionCode;

  @Column({ name: "postal_code", type: "varchar", length: 20 })
  postalCode!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
