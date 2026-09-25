import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { ShippingCityCode } from "@checkout/contracts";

@Entity({ name: "deliveries" })
export class DeliveryOrmEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "shipping_method_id", type: "uuid" })
  shippingMethodId!: string;

  @Column({ name: "address_line", type: "varchar", length: 300 })
  addressLine!: string;

  @Column({ type: "varchar", length: 20 })
  city!: ShippingCityCode;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
