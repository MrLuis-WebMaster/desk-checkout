import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "checkout_settings" })
export class CheckoutSettingOrmEntity {
  @PrimaryColumn({ type: "varchar", length: 100 })
  key!: string;

  @Column({ name: "value_cents", type: "integer" })
  valueCents!: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
