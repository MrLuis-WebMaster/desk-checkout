import { STRICT_THROTTLE, DEFAULT_THROTTLE } from "./throttle-limits.js";

describe("throttle-limits", () => {
  it("exposes a generous default and stricter checkout limits", () => {
    expect(DEFAULT_THROTTLE.limit).toBeGreaterThan(STRICT_THROTTLE.default.limit);
    expect(STRICT_THROTTLE.default.limit).toBe(20);
    expect(DEFAULT_THROTTLE.ttl).toBe(60_000);
  });
});
