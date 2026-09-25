/** Create-time stock failure: no Wompi charge yet. */
export const CREATE_OUT_OF_STOCK_MESSAGE =
  "Some items are out of stock. Update your cart and try again.";

/**
 * Pay/sync stock failure can follow an approved provider charge.
 * Do not tell the shopper to retry (duplicate payment risk).
 */
export const POST_CHARGE_OUT_OF_STOCK_MESSAGE =
  "Payment was received but we could not reserve stock. Do not try again. Contact support with your order reference.";
