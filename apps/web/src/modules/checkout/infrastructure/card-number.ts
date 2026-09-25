export type CardBrand = "visa" | "mastercard" | "amex" | "unknown";

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCardNumber(value: string): string {
  const digits = digitsOnly(value);
  const brand = detectCardBrand(digits);
  if (brand === "amex") {
    const groups = [
      digits.slice(0, 4),
      digits.slice(4, 10),
      digits.slice(10, 15),
    ].filter(Boolean);
    return groups.join(" ");
  }
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function detectCardBrand(value: string): CardBrand {
  const digits = digitsOnly(value);
  if (!digits) {
    return "unknown";
  }
  if (/^4/.test(digits)) {
    return "visa";
  }
  if (/^3[47]/.test(digits)) {
    return "amex";
  }
  const firstTwo = Number(digits.slice(0, 2));
  if (firstTwo >= 51 && firstTwo <= 55) {
    return "mastercard";
  }
  if (digits.length >= 4) {
    const firstFour = Number(digits.slice(0, 4));
    if (firstFour >= 2221 && firstFour <= 2720) {
      return "mastercard";
    }
  }
  return "unknown";
}

export function expectedCardLength(brand: CardBrand): number {
  return brand === "amex" ? 15 : 16;
}

export function expectedCvcLength(brand: CardBrand): number {
  return brand === "amex" ? 4 : 3;
}

export function luhnCheck(value: string): boolean {
  const digits = digitsOnly(value);
  if (digits.length < 13) {
    return false;
  }
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (Number.isNaN(digit)) {
      return false;
    }
    if (alternate) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}
