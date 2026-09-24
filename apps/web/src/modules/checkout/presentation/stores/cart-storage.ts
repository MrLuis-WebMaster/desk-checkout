export type CartLine = {
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  availableStock: number;
};

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const line = value as CartLine;
  return (
    typeof line.productId === "string" &&
    line.productId.length > 0 &&
    typeof line.name === "string" &&
    line.name.length > 0 &&
    typeof line.imageUrl === "string" &&
    isNonNegativeInt(line.price) &&
    isNonNegativeInt(line.quantity) &&
    isNonNegativeInt(line.availableStock) &&
    line.quantity >= 1 &&
    line.availableStock >= 1 &&
    line.quantity <= line.availableStock
  );
}

function normalizeLines(lines: CartLine[]): CartLine[] {
  const byId = new Map<string, CartLine>();
  for (const line of lines) {
    const existing = byId.get(line.productId);
    if (!existing) {
      byId.set(line.productId, { ...line });
      continue;
    }
    const availableStock = Math.max(
      existing.availableStock,
      line.availableStock,
    );
    byId.set(line.productId, {
      ...existing,
      availableStock,
      quantity: Math.min(
        existing.quantity + line.quantity,
        availableStock,
      ),
      name: line.name || existing.name,
      price: line.price,
      imageUrl: line.imageUrl || existing.imageUrl,
    });
  }
  return [...byId.values()];
}

/** Reads the current `{ lines }` payload and the older raw-array carts. */
export function parseStoredLines(raw: string): CartLine[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return normalizeLines(parsed.filter(isCartLine));
    }
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "lines" in parsed &&
      Array.isArray(parsed.lines)
    ) {
      return normalizeLines(parsed.lines.filter(isCartLine));
    }
    return [];
  } catch {
    return [];
  }
}
