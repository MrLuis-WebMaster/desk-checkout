import { describe, expect, it } from "vitest";
import { isCreateStillCurrent } from "./pending-create-freshness";

describe("isCreateStillCurrent", () => {
  it("accepts when epoch and fingerprint are unchanged", () => {
    expect(
      isCreateStillCurrent({
        epochAtStart: 1,
        epochNow: 1,
        fingerprintAtStart: "a|1",
        fingerprintNow: "a|1",
      }),
    ).toBe(true);
  });

  it("rejects when editDetails bumped the epoch", () => {
    expect(
      isCreateStillCurrent({
        epochAtStart: 1,
        epochNow: 2,
        fingerprintAtStart: "a|1",
        fingerprintNow: "a|1",
      }),
    ).toBe(false);
  });

  it("rejects when the cart fingerprint changed mid-flight", () => {
    expect(
      isCreateStillCurrent({
        epochAtStart: 1,
        epochNow: 1,
        fingerprintAtStart: "a|1",
        fingerprintNow: "b|1",
      }),
    ).toBe(false);
  });
});
