import { TransactionStatus } from "@checkout/contracts";
import { Money, Transaction } from "@checkout/settlement";
import { toTransactionDto } from "./transaction-dto.mapper";

describe("toTransactionDto", () => {
  it("maps aggregate money and dates to DTO primitives", () => {
    const transaction = Transaction.rehydrate({
      id: "33333333-3333-4333-8333-333333333333",
      status: TransactionStatus.Pending,
      lines: [
        {
          productId: "11111111-1111-4111-8111-111111111111",
          productName: "Lamp",
          productPrice: Money.create(10000),
          quantity: 2,
        },
      ],
      baseFee: Money.create(500),
      deliveryFee: Money.create(1500),
      total: Money.create(22000),
      customer: {
        fullName: "Ada",
        email: "ada@example.com",
        phone: "300",
      },
      delivery: {
        shippingMethodId: "22222222-2222-4222-8222-222222222222",
        addressLine: "Street",
        city: "BOG",
      },
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      providerTransactionId: null,
    });

    expect(toTransactionDto(transaction)).toEqual({
      id: transaction.id,
      status: TransactionStatus.Pending,
      productId: transaction.productId,
      productName: transaction.productName,
      productPrice: 10000,
      quantity: 2,
      lines: [
        {
          productId: "11111111-1111-4111-8111-111111111111",
          productName: "Lamp",
          productPrice: 10000,
          quantity: 2,
        },
      ],
      baseFee: 500,
      deliveryFee: 1500,
      total: 22000,
      customer: transaction.customer,
      delivery: transaction.delivery,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });
});
