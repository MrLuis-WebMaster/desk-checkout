import { Money } from "./money";

describe("Money", () => {
  it("creates non-negative integer amounts", () => {
    expect(Money.create(0).amount).toBe(0);
    expect(Money.create(100).equals(Money.create(100))).toBe(true);
    expect(Money.create(100).equals(Money.create(99))).toBe(false);
  });

  it("rejects fractional or negative amounts", () => {
    expect(() => Money.create(1.5)).toThrow(/non-negative integer/);
    expect(() => Money.create(-1)).toThrow(/non-negative integer/);
  });
});
