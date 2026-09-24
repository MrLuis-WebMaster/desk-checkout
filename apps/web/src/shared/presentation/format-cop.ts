const copFormatter = new Intl.NumberFormat("es-CO");

/** Formats integer COP amounts for display. */
export function formatCop(amount: number): string {
  return `${copFormatter.format(amount)} COP`;
}
