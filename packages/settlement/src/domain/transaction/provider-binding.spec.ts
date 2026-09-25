import { Money } from "../money.js";
import { providerPaymentMatchesTransaction } from "./provider-binding.js";

describe("providerPaymentMatchesTransaction", () => {
  const transaction = {
    id: "33333333-3333-4333-8333-333333333333",
    total: Money.create(12000),
  };

  it("accepts matching reference and amount-in-cents", () => {
    expect(
      providerPaymentMatchesTransaction(
        {
          reference: transaction.id,
          amountInCents: 1_200_000,
        },
        transaction,
      ),
    ).toBe(true);
  });

  it("rejects a missing or foreign reference", () => {
    expect(
      providerPaymentMatchesTransaction(
        { reference: undefined, amountInCents: 1_200_000 },
        transaction,
      ),
    ).toBe(false);
    expect(
      providerPaymentMatchesTransaction(
        {
          reference: "other-order",
          amountInCents: 1_200_000,
        },
        transaction,
      ),
    ).toBe(false);
  });

  it("rejects a missing or mismatched amount", () => {
    expect(
      providerPaymentMatchesTransaction(
        { reference: transaction.id },
        transaction,
      ),
    ).toBe(false);
    expect(
      providerPaymentMatchesTransaction(
        { reference: transaction.id, amountInCents: 999 },
        transaction,
      ),
    ).toBe(false);
  });
});
