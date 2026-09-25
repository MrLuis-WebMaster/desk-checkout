import { randomUUID } from "node:crypto";
import {
  TransactionStatus,
  type ShippingRegionCode,
} from "@checkout/contracts";
import { Money } from "#shared/domain/money.js";
import { InvalidTransactionStateError } from "./errors.js";

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
    readonly providerTransactionId: string | null,
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
      null,
    );
  }

  static rehydrate(props: {
    id: string;
    status: TransactionStatus;
    productId: string;
    productName: string;
    productPrice: Money;
    baseFee: Money;
    deliveryFee: Money;
    total: Money;
    customer: TransactionCustomer;
    delivery: TransactionDelivery;
    createdAt: Date;
    providerTransactionId: string | null;
  }): Transaction {
    return new Transaction(
      props.id,
      props.status,
      props.productId,
      props.productName,
      props.productPrice,
      props.baseFee,
      props.deliveryFee,
      props.total,
      props.customer,
      props.delivery,
      props.createdAt,
      props.providerTransactionId,
    );
  }

  canStartPayment(): boolean {
    return (
      this.status === TransactionStatus.Pending &&
      this.providerTransactionId === null
    );
  }

  hasProviderCharge(): boolean {
    return (
      this.providerTransactionId !== null &&
      !this.providerTransactionId.startsWith("claim:")
    );
  }

  applyProviderResult(
    providerTransactionId: string,
    status: TransactionStatus,
  ): Transaction {
    if (this.hasProviderCharge()) {
      if (
        this.providerTransactionId === providerTransactionId &&
        this.status === status
      ) {
        return this;
      }
      throw new InvalidTransactionStateError();
    }
    if (this.status !== TransactionStatus.Pending) {
      throw new InvalidTransactionStateError();
    }
    return new Transaction(
      this.id,
      status,
      this.productId,
      this.productName,
      this.productPrice,
      this.baseFee,
      this.deliveryFee,
      this.total,
      this.customer,
      this.delivery,
      this.createdAt,
      providerTransactionId,
    );
  }
}
