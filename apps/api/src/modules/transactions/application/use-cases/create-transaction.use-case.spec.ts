import { TransactionStatus } from "@checkout/contracts";
import type { FeeCatalog } from "#modules/shipping/application/ports/fee-catalog.port.js";
import { CreateTransactionUseCase } from "./create-transaction.use-case.js";
import type { ProductStockReader } from "../ports/product-stock-reader.port.js";
import type { TransactionWriter } from "../ports/transaction-writer.port.js";

const productId = "11111111-1111-4111-8111-111111111111";

const request = {
  items: [{ productId, quantity: 1 }],
  customer: {
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    phone: "3001234567",
  },
  delivery: {
    shippingMethodId: "22222222-2222-4222-8222-222222222222",
    addressLine: "Calle 1 # 2-3",
    city: "BOG" as const,
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
      id: productId,
      name: "Keyboard",
      price: 100000,
      availableStock: 2,
    });
    feeCatalog.getBaseFee.mockResolvedValue(5000);
    feeCatalog.getRate.mockResolvedValue({
      methodFound: true,
      amount: 8000,
    });
    transactionWriter.save.mockImplementation(async (transaction) => ({
      id: transaction.id,
      status: TransactionStatus.Pending,
      productId: transaction.productId,
      productName: transaction.productName,
      productPrice: transaction.productPrice.amount,
      quantity: transaction.quantity,
      lines: transaction.lines.map((line) => ({
        productId: line.productId,
        productName: line.productName,
        productPrice: line.productPrice.amount,
        quantity: line.quantity,
      })),
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
      amount: 9100,
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

  it("creates a transaction with multiple line items", async () => {
    const secondId = "44444444-4444-4444-8444-444444444444";
    productStockReader.findById.mockImplementation(async (id: string) => {
      if (id === productId) {
        return {
          id: productId,
          name: "Keyboard",
          price: 100000,
          availableStock: 2,
        };
      }
      if (id === secondId) {
        return {
          id: secondId,
          name: "Mouse",
          price: 50000,
          availableStock: 5,
        };
      }
      return null;
    });

    const result = await useCase.execute({
      ...request,
      items: [
        { productId, quantity: 1 },
        { productId: secondId, quantity: 2 },
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.total).toBe(213000);
      expect(result.value.lines).toHaveLength(2);
    }
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
      id: productId,
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
      amount: null,
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
      amount: null,
    });
    const result = await useCase.execute(request);
    expect(result).toMatchObject({
      ok: false,
      error: { code: "SHIPPING_RATE_NOT_FOUND" },
    });
  });
});
