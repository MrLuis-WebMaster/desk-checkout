export class Money {
  private constructor(readonly amount: number) {}

  static create(amount: number): Money {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new Error("Money amount must be a non-negative integer");
    }
    return new Money(amount);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount;
  }
}
