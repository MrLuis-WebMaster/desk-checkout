import { describe, expect, it } from "vitest";
import { toScreenResult } from "./to-screen-result";

describe("toScreenResult", () => {
  it("maps ok, aborted, api, and transport failures", () => {
    expect(toScreenResult({ ok: true, data: { id: "1" } })).toEqual({
      status: "ok",
      value: { id: "1" },
    });
    expect(
      toScreenResult({
        ok: false,
        error: { kind: "aborted" },
      }),
    ).toEqual({ status: "aborted" });
    expect(
      toScreenResult({
        ok: false,
        error: { kind: "api", code: "PRODUCT_NOT_FOUND", message: "x" },
      }),
    ).toEqual({ status: "not_found" });
    expect(
      toScreenResult({
        ok: false,
        error: { kind: "network" },
      }),
    ).toEqual({ status: "load_failed" });
  });
});
