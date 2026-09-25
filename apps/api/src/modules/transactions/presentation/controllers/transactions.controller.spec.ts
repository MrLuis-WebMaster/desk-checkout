import { Test } from "@nestjs/testing";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ApiErrorCode, TransactionStatus } from "@checkout/contracts";
import { err, ok } from "#shared/result/result.js";
import { CreateTransactionUseCase } from "../../application/use-cases/create-transaction.use-case.js";
import { GetTransactionUseCase } from "../../application/use-cases/get-transaction.use-case.js";
import { GetWidgetCheckoutSessionUseCase } from "../../application/use-cases/get-widget-checkout-session.use-case.js";
import { PayTransactionUseCase } from "../../application/use-cases/pay-transaction.use-case.js";
import { SyncProviderPaymentUseCase } from "../../application/use-cases/sync-provider-payment.use-case.js";
import {
  OutOfStockError,
  TransactionNotFoundError,
} from "../../domain/transaction/errors.js";
import { CreateTransactionDto } from "../dto/transaction.dto.js";
import { TransactionsController } from "./transactions.controller.js";

describe("TransactionsController", () => {
  const createTransaction = { execute: jest.fn() };
  const getTransaction = { execute: jest.fn() };
  const getWidgetCheckoutSession = { execute: jest.fn() };
  const payTransaction = { execute: jest.fn() };
  const syncProviderPayment = { execute: jest.fn() };
  let controller: TransactionsController;

  const createBody = {
    items: [
      {
        productId: "11111111-1111-4111-8111-111111111111",
        quantity: 1,
      },
    ],
    customer: {
      fullName: "Ada",
      email: "ada@example.com",
      phone: "123",
    },
    delivery: {
      shippingMethodId: "22222222-2222-4222-8222-222222222222",
      addressLine: "Street",
      city: "BOG" as const,
    },
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        { provide: CreateTransactionUseCase, useValue: createTransaction },
        { provide: GetTransactionUseCase, useValue: getTransaction },
        {
          provide: GetWidgetCheckoutSessionUseCase,
          useValue: getWidgetCheckoutSession,
        },
        { provide: PayTransactionUseCase, useValue: payTransaction },
        {
          provide: SyncProviderPaymentUseCase,
          useValue: syncProviderPayment,
        },
      ],
    }).compile();
    controller = moduleRef.get(TransactionsController);
    jest.resetAllMocks();
  });

  it("returns the created transaction", async () => {
    const transaction = {
      id: "33333333-3333-4333-8333-333333333333",
      status: TransactionStatus.Pending,
    };
    createTransaction.execute.mockResolvedValue(ok(transaction));
    await expect(controller.create(createBody)).resolves.toEqual(transaction);
  });

  it("maps out of stock to HTTP 409", async () => {
    createTransaction.execute.mockResolvedValue(err(new OutOfStockError()));
    await expect(controller.create(createBody)).rejects.toMatchObject({
      response: { code: ApiErrorCode.OutOfStock },
      status: 409,
    });
  });

  it("maps missing transactions to HTTP 404", async () => {
    getTransaction.execute.mockResolvedValue(
      err(new TransactionNotFoundError()),
    );
    await expect(
      controller.show({ id: "33333333-3333-4333-8333-333333333333" }),
    ).rejects.toMatchObject({
      response: { code: ApiErrorCode.TransactionNotFound },
      status: 404,
    });
  });

  it("rejects a missing idempotency key on pay", async () => {
    await expect(
      controller.pay(
        { id: "33333333-3333-4333-8333-333333333333" },
        undefined,
        {
          paymentMethodToken: "tok",
          acceptanceToken: "acc",
          acceptPersonalAuth: "auth",
          installments: 1,
        },
      ),
    ).rejects.toMatchObject({
      response: { code: ApiErrorCode.ValidationError },
      status: 400,
    });
  });

  it("rejects an idempotency key longer than 200 characters", async () => {
    await expect(
      controller.sync(
        { id: "33333333-3333-4333-8333-333333333333" },
        "k".repeat(201),
        { providerTransactionId: "wompi_1" },
      ),
    ).rejects.toMatchObject({
      response: { code: ApiErrorCode.ValidationError },
      status: 400,
    });
    expect(syncProviderPayment.execute).not.toHaveBeenCalled();
  });
});

describe("CreateTransactionDto", () => {
  const validBody = {
    items: [
      {
        productId: "11111111-1111-4111-8111-111111111111",
        quantity: 1,
      },
    ],
    customer: {
      fullName: "Ada",
      email: "ada@example.com",
      phone: "123",
    },
    delivery: {
      shippingMethodId: "22222222-2222-4222-8222-222222222222",
      addressLine: "Street",
      city: "BOG",
    },
  };

  it("rejects missing customer", async () => {
    const { customer: _customer, ...withoutCustomer } = validBody;
    const dto = plainToInstance(CreateTransactionDto, withoutCustomer);
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === "customer")).toBe(true);
  });

  it("rejects missing delivery", async () => {
    const { delivery: _delivery, ...withoutDelivery } = validBody;
    const dto = plainToInstance(CreateTransactionDto, withoutDelivery);
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === "delivery")).toBe(true);
  });

  it("rejects whitespace-only fullName", async () => {
    const dto = plainToInstance(CreateTransactionDto, {
      ...validBody,
      customer: { ...validBody.customer, fullName: "   " },
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
