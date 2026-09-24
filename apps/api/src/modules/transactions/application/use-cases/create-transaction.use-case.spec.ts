import { TransactionStatus } from "@checkout/contracts";
import type { FeeCatalog } from "#modules/shipping/application/ports/fee-catalog.port.js";
import { CreateTransactionUseCase } from "./create-transaction.use-case.js";
import type { ProductStockReader } from "../ports/product-stock-reader.port.js";
import type { TransactionWriter } from "../ports/transaction-writer.port.js";

const request = {
  productId: "11111111-1111-4111-8111-111111111111",
  customer: {
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    phone: "3001234567",
  },
  delivery: {
    shippingMethodId: "22222222-2222-4222-8222-222222222222",
    addressLine: "Calle 1 # 2-3",
    city: "Bogotá",
    regionCode: "BOG" as const,
    postalCode: "110111",
  },
};

describe("CreateTransactionUseCase", () => {
  const productStockReader = {
    findById: jest.fn(),
  };
  const feeCatalog = {
    getBaseFee: jest.fn(),
    getRate: jest.fn(),
    listQuotes: jest.fn(),
  };
  const transactionWriter = {
    save: jest.fn(),
  };
  const useCase = new CreateTransactionUseCase(
    productStockReader as ProductStockReader,
    feeCatalog as FeeCatalog,
    transactionWriter as TransactionWriter,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    productStockReader.findById.mockResolvedValue({
      id: request.productId,
      name: "Keyboard",
      price: 100000,
      availableStock: 2,
    });
    feeCatalog.getBaseFee.mockResolvedValue(5000);
    feeCatalog.getRate.mockResolvedValue({
      methodFound: true,
      amountCents: 8000,
    });
    transactionWriter.save.mockImplementation(async (transaction) => ({
      id: transaction.id,
      status: TransactionStatus.Pending,
      productId: transaction.productId,
      productName: transaction.productName,
      productPrice: transaction.productPrice.amount,
      baseFee: transaction.baseFee.amount,
      deliveryFee: transaction.deliveryFee.amount,
      total: transaction.total.amount,
      customer: transaction.customer,
      delivery: transaction.delivery,
      createdAt: transaction.createdAt.toISOString(),
    }));
  });

  it("creates a pending transaction and snapshots the current fees", async () => {
    feeCatalog.getBaseFee.mockResolvedValue(7300);
    feeCatalog.getRate.mockResolvedValue({
      methodFound: true,
      amountCents: 9100,
    });

    const result = await useCase.execute(request);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({
        status: TransactionStatus.Pending,
        baseFee: 7300,
        deliveryFee: 9100,
        total: 116400,
      });
    }
    expect(transactionWriter.save).toHaveBeenCalledTimes(1);
  });

  it("returns ProductNotFound when the product is missing", async () => {
    productStockReader.findById.mockResolvedValue(null);
    const result = await useCase.execute(request);
    expect(result).toMatchObject({
      ok: false,
      error: { code: "PRODUCT_NOT_FOUND" },
    });
  });

  it("returns OutOfStock when inventory is zero", async () => {
    productStockReader.findById.mockResolvedValue({
      id: request.productId,
      name: "Keyboard",
      price: 100000,
      availableStock: 0,
    });
    const result = await useCase.execute(request);
    expect(result).toMatchObject({
      ok: false,
      error: { code: "OUT_OF_STOCK" },
    });
  });

  it("returns CheckoutSettingsNotFound when base fee is absent", async () => {
    feeCatalog.getBaseFee.mockResolvedValue(null);
    const result = await useCase.execute(request);
    expect(result).toMatchObject({
      ok: false,
      error: { code: "CHECKOUT_SETTINGS_NOT_FOUND" },
    });
  });

  it("returns ShippingMethodNotFound for an absent or inactive method", async () => {
    feeCatalog.getRate.mockResolvedValue({
      methodFound: false,
      amountCents: null,
    });
    const result = await useCase.execute(request);
    expect(result).toMatchObject({
      ok: false,
      error: { code: "SHIPPING_METHOD_NOT_FOUND" },
    });
  });

  it("returns ShippingRateNotFound when the region rate is absent", async () => {
    feeCatalog.getRate.mockResolvedValue({
      methodFound: true,
      amountCents: null,
    });
    const result = await useCase.execute(request);
    expect(result).toMatchObject({
      ok: false,
      error: { code: "SHIPPING_RATE_NOT_FOUND" },
    });
  });
});
