import type { Money } from "#shared/domain/money.js";

/** Convert major-unit COP money to provider amount-in-cents. */
export function toProviderAmountInCents(money: Money): number {
  return money.amount * 100;
}
