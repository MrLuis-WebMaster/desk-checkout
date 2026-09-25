import { DEFAULT_THROTTLE, STRICT_THROTTLE } from "./throttle-limits.js";
import { resolveTrustProxy } from "./trust-proxy.js";

/**
 * Documents the Phase 8 throttle + trust-proxy policy in one place for coverage.
 */
describe("security http policy", () => {
  it("keeps checkout routes stricter than the global budget", () => {
    expect(STRICT_THROTTLE.default.limit).toBeLessThan(DEFAULT_THROTTLE.limit);
    expect(DEFAULT_THROTTLE.name).toBe("default");
  });

  it("keeps trust proxy off until TRUST_PROXY is set explicitly", () => {
    expect(resolveTrustProxy("production", undefined)).toBe(false);
    expect(resolveTrustProxy("production", "1")).toBe(1);
  });
});
