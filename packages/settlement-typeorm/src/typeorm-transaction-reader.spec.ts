import { TransactionStatus } from "@checkout/contracts";
import { TypeOrmTransactionReader } from "./typeorm-transaction-reader";

const baseRow = {
  id: "33333333-3333-4333-8333-333333333333",
  status: TransactionStatus.Pending,
  productId: "11111111-1111-4111-8111-111111111111",
  productName: "Lamp",
  productPrice: 10000,
  quantity: 1,
  lineItems: null,
  baseFee: 500,
  deliveryFee: 1500,
  total: 12000,
  fullName: "Ada",
  email: "ada@example.com",
  phone: "300",
  shippingMethodId: "22222222-2222-4222-8222-222222222222",
  addressLine: "Street",
  city: "BOG",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  providerTransactionId: null,
};

describe("TypeOrmTransactionReader", () => {
  const qb = {
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
  };
  const transactions = {
    createQueryBuilder: jest.fn(() => qb),
  };
  const reader = new TypeOrmTransactionReader(transactions as never);

  beforeEach(() => {
    jest.clearAllMocks();
    transactions.createQueryBuilder.mockReturnValue(qb);
    qb.innerJoin.mockReturnThis();
    qb.select.mockReturnThis();
    qb.where.mockReturnThis();
    qb.andWhere.mockReturnThis();
  });

  it("returns null when the id is missing", async () => {
    qb.getRawOne.mockResolvedValue(undefined);
    await expect(reader.findById("missing")).resolves.toBeNull();
    await expect(reader.findAggregateById("missing")).resolves.toBeNull();
  });

  it("maps a legacy single-line row without lineItems", async () => {
    qb.getRawOne.mockResolvedValue(baseRow);
    const dto = await reader.findById(baseRow.id);
    expect(dto).toMatchObject({
      id: baseRow.id,
      productName: "Lamp",
      quantity: 1,
      lines: [
        expect.objectContaining({
          productId: baseRow.productId,
          quantity: 1,
        }),
      ],
    });
  });

  it("parses JSON lineItems when present", async () => {
    qb.getRawOne.mockResolvedValue({
      ...baseRow,
      lineItems: JSON.stringify([
        {
          productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          productName: "Desk",
          productPrice: 20000,
          quantity: 2,
        },
      ]),
    });
    const aggregate = await reader.findAggregateById(baseRow.id);
    expect(aggregate?.lines).toHaveLength(1);
    expect(aggregate?.productName).toBe("Desk");
  });

  it("finds by provider id and lists stuck/orphan pending", async () => {
    qb.getRawOne.mockResolvedValue({
      ...baseRow,
      providerTransactionId: "wompi_1",
    });
    const byProvider = await reader.findAggregateByProviderId("wompi_1");
    expect(byProvider?.providerTransactionId).toBe("wompi_1");

    qb.getRawMany.mockResolvedValue([baseRow]);
    const stuck = await reader.listStuckPending(new Date());
    expect(stuck).toHaveLength(1);

    const orphan = await reader.listOrphanPending(new Date(), {
      claimLeaseBefore: new Date(),
    });
    expect(orphan).toHaveLength(1);
    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining("claimPrefix"),
      expect.objectContaining({ claimPrefix: "claim:%" }),
    );
  });
});
