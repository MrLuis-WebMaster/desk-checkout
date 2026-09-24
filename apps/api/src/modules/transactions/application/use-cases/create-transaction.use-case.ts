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
import { Money } from "../../domain/transaction/money.js";
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
    const product = await this.productStockReader.findById(request.productId);
    if (!product) {
      return err(new ProductNotFoundError());
    }
    if (product.availableStock < 1) {
      return err(new OutOfStockError());
    }

    const baseFee = await this.feeCatalog.getBaseFee();
    if (baseFee === null) {
      return err(new CheckoutSettingsNotFoundError());
    }

    const rate = await this.feeCatalog.getRate(
      request.delivery.shippingMethodId,
      request.delivery.regionCode,
    );
    if (!rate.methodFound) {
      return err(
        new ShippingMethodNotFoundError(
          request.delivery.shippingMethodId,
        ),
      );
    }
    if (rate.amountCents === null) {
      return err(
        new ShippingRateNotFoundError(
          request.delivery.shippingMethodId,
          request.delivery.regionCode,
        ),
      );
    }

    const transaction = Transaction.createPending({
      productId: product.id,
      productName: product.name,
      productPrice: Money.create(product.price),
      baseFee: Money.create(baseFee),
      deliveryFee: Money.create(rate.amountCents),
      customer: request.customer,
      delivery: request.delivery,
    });
    return ok(await this.transactionWriter.save(transaction));
  }
}
