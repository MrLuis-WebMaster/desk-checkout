/** Compare the total shown to the shopper with the server snapshot on the PENDING order. */
export function reconcileChargeTotal(input: {
  displayedTotal: number;
  chargedTotal: number;
}): { ok: true } | { ok: false; message: string } {
  if (input.displayedTotal === input.chargedTotal) {
    return { ok: true };
  }
  return {
    ok: false,
    message: "The order total changed. Review the summary and try again.",
  };
}
