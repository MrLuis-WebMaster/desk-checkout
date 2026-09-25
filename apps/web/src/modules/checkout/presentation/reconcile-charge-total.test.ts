import { describe, expect, it } from "vitest";
import { reconcileChargeTotal } from "./reconcile-charge-total";

describe("reconcileChargeTotal", () => {
  it("accepts matching totals", () => {
    expect(
      reconcileChargeTotal({ displayedTotal: 10_000, chargedTotal: 10_000 }),
    ).toEqual({ ok: true });
  });

  it("rejects when the server total diverges", () => {
    expect(
      reconcileChargeTotal({ displayedTotal: 10_000, chargedTotal: 11_000 }),
    ).toEqual({
      ok: false,
      message: "The order total changed. Review the summary and try again.",
    });
  });
});
