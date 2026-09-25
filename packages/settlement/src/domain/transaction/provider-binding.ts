import type { ProviderPayment } from "../../application/ports/payment-gateway.port.js";
import type { Money } from "../money.js";
import { toProviderAmountInCents } from "./provider-amount.js";

/**
 * Fail-closed binding: a provider charge may only settle the local order whose
 * id was sent as Wompi `reference`, for the exact amount-in-cents.
 */
export function providerPaymentMatchesTransaction(
  provider: Pick<ProviderPayment, "reference" | "amountInCents">,
  transaction: { id: string; total: Money },
): boolean {
  if (!provider.reference || provider.reference !== transaction.id) {
    return false;
  }
  if (typeof provider.amountInCents !== "number") {
    return false;
  }
  return (
    provider.amountInCents === toProviderAmountInCents(transaction.total)
  );
}
