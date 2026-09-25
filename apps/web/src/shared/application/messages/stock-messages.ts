/** Create-time stock failure: no Wompi charge yet. */
export const CREATE_OUT_OF_STOCK_MESSAGE =
  "Some items are out of stock. Update your cart and try again.";

/**
 * Pay/sync stock failure can follow an approved provider charge.
 * Do not tell the shopper to retry (duplicate payment risk).
 * Always include the order id so support can look it up.
 */
export function postChargeOutOfStockMessage(orderReference: string): string {
  const id = orderReference.trim();
  return id
    ? `Payment was received but we could not reserve stock. Do not try again. Contact support with order ${id}.`
    : "Payment was received but we could not reserve stock. Do not try again. Contact support with your order reference.";
}
