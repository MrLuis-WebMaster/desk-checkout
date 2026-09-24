import { randomUUID } from "node:crypto";
import {
  TransactionStatus,
  type ShippingRegionCode,
} from "@checkout/contracts";
import { Money } from "./money.js";

export type TransactionCustomer = {
  fullName: string;
  email: string;
  phone: string;
};

export type TransactionDelivery = {
  shippingMethodId: string;
  addressLine: string;
  city: string;
  regionCode: ShippingRegionCode;
  postalCode: string;
};

export class Transaction {
  private constructor(
    readonly id: string,
    readonly status: TransactionStatus,
    readonly productId: string,
    readonly productName: string,
    readonly productPrice: Money,
    readonly baseFee: Money,
    readonly deliveryFee: Money,
    readonly total: Money,
    readonly customer: TransactionCustomer,
    readonly delivery: TransactionDelivery,
    readonly createdAt: Date,
  ) {}

  static createPending(props: {
    productId: string;
    productName: string;
    productPrice: Money;
    baseFee: Money;
    deliveryFee: Money;
    customer: TransactionCustomer;
    delivery: TransactionDelivery;
  }): Transaction {
    const total = Money.create(
      props.productPrice.amount +
        props.baseFee.amount +
        props.deliveryFee.amount,
    );
    return new Transaction(
      randomUUID(),
      TransactionStatus.Pending,
      props.productId,
      props.productName,
      props.productPrice,
      props.baseFee,
      props.deliveryFee,
      total,
      props.customer,
      props.delivery,
      new Date(),
    );
  }
}
