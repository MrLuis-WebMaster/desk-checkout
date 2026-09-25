export type CheckoutTotalInput = {
  unitPrice: number;
  quantity: number;
  baseFee: number;
  deliveryFee: number;
};

export type CheckoutLineInput = {
  unitPrice: number;
  quantity: number;
};

export function normalizeCheckoutQuantity(quantity: number): number {
  return Math.max(1, Math.floor(quantity));
}

export function computeLineSubtotal(unitPrice: number, quantity: number): number {
  return unitPrice * normalizeCheckoutQuantity(quantity);
}

export function computeMerchandiseTotal(lines: CheckoutLineInput[]): number {
  return lines.reduce(
    (total, line) =>
      total + computeLineSubtotal(line.unitPrice, line.quantity),
    0,
  );
}

/** Single formula for cart preview and pending transaction totals. */
export function computeCheckoutTotal(input: CheckoutTotalInput): number {
  return (
    computeLineSubtotal(input.unitPrice, input.quantity) +
    input.baseFee +
    input.deliveryFee
  );
}

export function computeOrderTotal(input: {
  lines: CheckoutLineInput[];
  baseFee: number;
  deliveryFee: number;
}): number {
  return (
    computeMerchandiseTotal(input.lines) + input.baseFee + input.deliveryFee
  );
}
