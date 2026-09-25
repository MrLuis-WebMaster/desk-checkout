import { isUniqueViolation } from "./is-unique-violation";

describe("isUniqueViolation", () => {
  it("detects Postgres 23505 on the error or driverError", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ driverError: { code: "23505" } })).toBe(true);
  });

  it("rejects non-unique errors", () => {
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation("boom")).toBe(false);
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation({})).toBe(false);
  });
});
