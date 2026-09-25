import { describe, expect, it } from "vitest";
import {
  detectCardBrand,
  digitsOnly,
  expectedCardLength,
  expectedCvcLength,
  formatCardNumber,
  luhnCheck,
} from "./card-number";

describe("card-number helpers", () => {
  it("detects brands and formats groups", () => {
    expect(detectCardBrand("4111111111111111")).toBe("visa");
    expect(detectCardBrand("5500000000000004")).toBe("mastercard");
    expect(detectCardBrand("378282246310005")).toBe("amex");
    expect(formatCardNumber("4111111111111111")).toBe("4111 1111 1111 1111");
    expect(formatCardNumber("378282246310005")).toBe("3782 822463 10005");
    expect(expectedCardLength("amex")).toBe(15);
    expect(expectedCvcLength("visa")).toBe(3);
    expect(digitsOnly("4111-1111")).toBe("41111111");
  });

  it("validates luhn checksums", () => {
    expect(luhnCheck("4111111111111111")).toBe(true);
    expect(luhnCheck("4111111111111112")).toBe(false);
    expect(luhnCheck("123")).toBe(false);
  });
});
