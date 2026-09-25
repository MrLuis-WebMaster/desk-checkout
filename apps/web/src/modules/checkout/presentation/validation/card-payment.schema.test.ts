import { describe, expect, it } from "vitest";
import { cardPaymentSchema } from "./card-payment.schema";

describe("cardPaymentSchema", () => {
  const valid = {
    cardHolder: "Ada Lovelace",
    cardNumber: "4111111111111111",
    expMonth: "12",
    expYear: "30",
    cvc: "123",
    installments: "1",
    accepted: true,
  };

  it("accepts a valid visa payload", () => {
    expect(cardPaymentSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an invalid luhn number and missing acceptance", () => {
    expect(
      cardPaymentSchema.safeParse({
        ...valid,
        cardNumber: "4111111111111112",
      }).success,
    ).toBe(false);
    expect(
      cardPaymentSchema.safeParse({ ...valid, accepted: false }).success,
    ).toBe(false);
  });
});
