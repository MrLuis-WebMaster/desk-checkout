import { randomUUID } from "node:crypto";
import {
  TransactionStatus,
  computeOrderTotal,
  normalizeCheckoutQuantity,
  type ShippingCityCode,
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
  city: ShippingCityCode;
};

export type TransactionLine = {
  productId: string;
  productName: string;
  productPrice: Money;
  quantity: number;
};

export class Transaction {
  private constructor(
    readonly id: string,
    readonly status: TransactionStatus,
    readonly lines: TransactionLine[],
    readonly baseFee: Money,
    readonly deliveryFee: Money,
    readonly total: Money,
    readonly customer: TransactionCustomer,
    readonly delivery: TransactionDelivery,
    readonly createdAt: Date,
    readonly providerTransactionId: string | null,
  ) {}

  get productId(): string {
    return this.lines[0]?.productId ?? "";
  }

  get productName(): string {
    if (this.lines.length === 0) {
      return "";
    }
    if (this.lines.length === 1) {
      return this.lines[0]!.productName;
    }
    return `${this.lines[0]!.productName} +${this.lines.length - 1} more`;
  }

  get productPrice(): Money {
    return this.lines[0]?.productPrice ?? Money.create(0);
  }

  get quantity(): number {
    return this.lines[0]?.quantity ?? 1;
  }

  static createPending(props: {
    lines: TransactionLine[];
    baseFee: Money;
    deliveryFee: Money;
    customer: TransactionCustomer;
    delivery: TransactionDelivery;
  }): Transaction {
    const lines = props.lines.map((line) => ({
      ...line,
      quantity: normalizeCheckoutQuantity(line.quantity),
    }));
    if (lines.length === 0) {
      throw new Error("Transaction requires at least one line");
    }
    const total = Money.create(
      computeOrderTotal({
        lines: lines.map((line) => ({
          unitPrice: line.productPrice.amount,
          quantity: line.quantity,
        })),
        baseFee: props.baseFee.amount,
        deliveryFee: props.deliveryFee.amount,
      }),
    );
    return new Transaction(
      randomUUID(),
      TransactionStatus.Pending,
      lines,
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
    lines: TransactionLine[];
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
      props.lines,
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
      if (this.providerTransactionId !== providerTransactionId) {
        throw new InvalidTransactionStateError();
      }
      if (this.status === status) {
        return this;
      }
      if (this.status === TransactionStatus.Pending) {
        return this.withPayment(providerTransactionId, status);
      }
      throw new InvalidTransactionStateError();
    }
    if (this.status !== TransactionStatus.Pending) {
      throw new InvalidTransactionStateError();
    }
    return this.withPayment(providerTransactionId, status);
  }

  private withPayment(
    providerTransactionId: string,
    status: TransactionStatus,
  ): Transaction {
    return new Transaction(
      this.id,
      status,
      this.lines,
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
