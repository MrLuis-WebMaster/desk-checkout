export class CheckoutSettingsNotFoundError extends Error {
  readonly code = "CHECKOUT_SETTINGS_NOT_FOUND";
}

export class ShippingMethodNotFoundError extends Error {
  readonly code = "SHIPPING_METHOD_NOT_FOUND";

  constructor(readonly shippingMethodId: string) {
    super(`Shipping method ${shippingMethodId} was not found or is inactive`);
  }
}

export class ShippingRateNotFoundError extends Error {
  readonly code = "SHIPPING_RATE_NOT_FOUND";

  constructor(
    readonly shippingMethodId: string,
    readonly regionCode: string,
  ) {
    super(
      `Shipping rate for method ${shippingMethodId} and region ${regionCode} was not found`,
    );
  }
}
