import { Test } from "@nestjs/testing";
import { ApiErrorCode, TransactionStatus } from "@checkout/contracts";
import { err, ok } from "#shared/result/result.js";
import { CreateTransactionUseCase } from "../../application/use-cases/create-transaction.use-case.js";
import { GetTransactionUseCase } from "../../application/use-cases/get-transaction.use-case.js";
import {
  OutOfStockError,
  TransactionNotFoundError,
} from "../../domain/transaction/errors.js";
import { TransactionsController } from "./transactions.controller.js";

describe("TransactionsController", () => {
  const createTransaction = { execute: jest.fn() };
  const getTransaction = { execute: jest.fn() };
  let controller: TransactionsController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        { provide: CreateTransactionUseCase, useValue: createTransaction },
        { provide: GetTransactionUseCase, useValue: getTransaction },
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
    await expect(
      controller.create({
        productId: "11111111-1111-4111-8111-111111111111",
        customer: {
          fullName: "Ada",
          email: "ada@example.com",
          phone: "123",
        },
        delivery: {
          shippingMethodId: "22222222-2222-4222-8222-222222222222",
          addressLine: "Street",
          city: "Bogotá",
          regionCode: "BOG",
          postalCode: "110111",
        },
      }),
    ).resolves.toEqual(transaction);
  });

  it("maps out of stock to HTTP 409", async () => {
    createTransaction.execute.mockResolvedValue(err(new OutOfStockError()));
    await expect(
      controller.create({
        productId: "11111111-1111-4111-8111-111111111111",
        customer: {
          fullName: "Ada",
          email: "ada@example.com",
          phone: "123",
        },
        delivery: {
          shippingMethodId: "22222222-2222-4222-8222-222222222222",
          addressLine: "Street",
          city: "Bogotá",
          regionCode: "BOG",
          postalCode: "110111",
        },
      }),
    ).rejects.toMatchObject({
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
});
