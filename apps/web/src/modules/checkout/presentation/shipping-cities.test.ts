import { describe, expect, it } from "vitest";
import { SHIPPING_CITY_LABELS } from "./shipping-cities";

describe("shipping-cities", () => {
  it("labels every city code", () => {
    expect(SHIPPING_CITY_LABELS.BOG).toMatch(/Bogotá/);
    expect(SHIPPING_CITY_LABELS.OTHER).toMatch(/Other/i);
  });
});
