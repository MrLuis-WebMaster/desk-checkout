import { describe, expect, it } from "vitest";
import { formatCop } from "./format-cop";

describe("formatCop", () => {
  it("formats integer COP amounts", () => {
    expect(formatCop(12000)).toMatch(/12\.000 COP|12,000 COP/);
  });
});
