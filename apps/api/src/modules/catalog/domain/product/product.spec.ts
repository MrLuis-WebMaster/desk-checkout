import { Money } from "#shared/domain/money.js";
import { Product } from "./product";

describe("Product", () => {
  it("creates an immutable product aggregate", () => {
    const product = Product.create({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Lamp",
      description: "Bright",
      price: Money.create(10000),
      imageUrl: "/lamp.jpg",
    });
    expect(product.name).toBe("Lamp");
    expect(product.price.amount).toBe(10000);
  });
});
