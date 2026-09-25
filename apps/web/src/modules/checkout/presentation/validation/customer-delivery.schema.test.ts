import { describe, expect, it } from "vitest";
import { customerDeliverySchema } from "./customer-delivery.schema";

describe("customerDeliverySchema", () => {
  const valid = {
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    phone: "3001234567",
    addressLine: "Calle 1",
    city: "BOG",
    shippingMethodId: "22222222-2222-4222-8222-222222222222",
  };

  it("accepts a valid payload", () => {
    expect(customerDeliverySchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid email and city", () => {
    expect(
      customerDeliverySchema.safeParse({ ...valid, email: "nope" }).success,
    ).toBe(false);
    expect(
      customerDeliverySchema.safeParse({ ...valid, city: "NYC" }).success,
    ).toBe(false);
  });
});
