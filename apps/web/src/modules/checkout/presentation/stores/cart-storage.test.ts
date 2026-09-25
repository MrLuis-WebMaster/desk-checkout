import { describe, expect, it } from "vitest";
import { parseStoredLines } from "./cart-storage";

describe("parseStoredLines", () => {
  const valid = {
    productId: "p1",
    name: "Lamp",
    price: 10000,
    imageUrl: "/lamp.jpg",
    quantity: 1,
    availableStock: 3,
  };

  it("parses object and legacy array payloads", () => {
    expect(parseStoredLines(JSON.stringify({ lines: [valid] }))).toEqual([
      valid,
    ]);
    expect(parseStoredLines(JSON.stringify([valid]))).toEqual([valid]);
  });

  it("drops invalid lines and bad JSON", () => {
    expect(
      parseStoredLines(
        JSON.stringify({
          lines: [{ ...valid, quantity: 0 }, { ...valid, availableStock: 0 }],
        }),
      ),
    ).toEqual([]);
    expect(parseStoredLines("not-json")).toEqual([]);
  });

  it("merges duplicate product ids without exceeding stock", () => {
    expect(
      parseStoredLines(
        JSON.stringify({
          lines: [
            { ...valid, quantity: 2, availableStock: 2 },
            { ...valid, quantity: 2, availableStock: 2 },
          ],
        }),
      ),
    ).toEqual([{ ...valid, quantity: 2, availableStock: 2 }]);
  });
});
