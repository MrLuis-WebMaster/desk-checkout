import { Money } from "./money.js";

export class Product {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly description: string,
    readonly price: Money,
    readonly imageUrl: string,
  ) {}

  static create(props: {
    id: string;
    name: string;
    description: string;
    price: Money;
    imageUrl: string;
  }): Product {
    return new Product(
      props.id,
      props.name,
      props.description,
      props.price,
      props.imageUrl,
    );
  }
}
