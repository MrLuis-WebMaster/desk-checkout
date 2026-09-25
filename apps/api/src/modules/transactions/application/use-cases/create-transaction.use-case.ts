import { Injectable } from "@nestjs/common";
import type {
  CreateTransactionRequest,
  TransactionDto,
} from "@checkout/contracts";
import { err, ok, type Result } from "#shared/result/result.js";
import { FeeCatalog } from "#modules/shipping/application/ports/fee-catalog.port.js";
import {
  CheckoutSettingsNotFoundError,
  ShippingMethodNotFoundError,
  ShippingRateNotFoundError,
} from "#modules/shipping/domain/fee/errors.js";
import {
  OutOfStockError,
  ProductNotFoundError,
} from "../../domain/transaction/errors.js";
import { Money } from "#shared/domain/money.js";
import { Transaction } from "../../domain/transaction/transaction.js";
import { ProductStockReader } from "../ports/product-stock-reader.port.js";
import { TransactionWriter } from "../ports/transaction-writer.port.js";

type CreateTransactionError =
  | ProductNotFoundError
  | OutOfStockError
  | CheckoutSettingsNotFoundError
  | ShippingMethodNotFoundError
  | ShippingRateNotFoundError;

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    private readonly productStockReader: ProductStockReader,
    private readonly feeCatalog: FeeCatalog,
    private readonly transactionWriter: TransactionWriter,
  ) {}

  async execute(
    request: CreateTransactionRequest,
  ): Promise<Result<TransactionDto, CreateTransactionError>> {
    if (!request.items?.length) {
      return err(new ProductNotFoundError());
    }

    const lines = [];
    for (const item of request.items) {
      const product = await this.productStockReader.findById(item.productId);
      if (!product) {
        return err(new ProductNotFoundError());
      }
      if (product.availableStock < item.quantity) {
        return err(new OutOfStockError());
      }
      lines.push({
        productId: product.id,
        productName: product.name,
        productPrice: Money.create(product.price),
        quantity: item.quantity,
      });
    }

    const baseFee = await this.feeCatalog.getBaseFee();
    if (baseFee === null) {
      return err(new CheckoutSettingsNotFoundError());
    }

    const rate = await this.feeCatalog.getRate(
      request.delivery.shippingMethodId,
      request.delivery.city,
    );
    if (!rate.methodFound) {
      return err(
        new ShippingMethodNotFoundError(request.delivery.shippingMethodId),
      );
    }
    if (rate.amount === null) {
      return err(
        new ShippingRateNotFoundError(
          request.delivery.shippingMethodId,
          request.delivery.city,
        ),
      );
    }

    const transaction = Transaction.createPending({
      lines,
      baseFee: Money.create(baseFee),
      deliveryFee: Money.create(rate.amount),
      customer: request.customer,
      delivery: request.delivery,
    });
    return ok(await this.transactionWriter.save(transaction));
  }
}
