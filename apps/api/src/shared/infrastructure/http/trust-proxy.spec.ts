import { resolveTrustProxy } from "./trust-proxy.js";

describe("resolveTrustProxy", () => {
  it("defaults to false (no hop trust) even in production", () => {
    expect(resolveTrustProxy("production", undefined)).toBe(false);
    expect(resolveTrustProxy("production", "")).toBe(false);
  });

  it("defaults to false outside production", () => {
    expect(resolveTrustProxy("development", undefined)).toBe(false);
    expect(resolveTrustProxy("test", undefined)).toBe(false);
  });

  it("honors explicit boolean and hop count", () => {
    expect(resolveTrustProxy("development", "true")).toBe(1);
    expect(resolveTrustProxy("production", "false")).toBe(false);
    expect(resolveTrustProxy("development", "2")).toBe(2);
  });
});
