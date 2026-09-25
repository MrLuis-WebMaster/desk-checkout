import { describe, expect, it } from "vitest";
import { parseWebEnv } from "./env";

describe("parseWebEnv", () => {
  it("accepts http(s) API urls and strips trailing slashes", () => {
    expect(
      parseWebEnv({ VITE_API_URL: "http://localhost:3000/" }),
    ).toEqual({ VITE_API_URL: "http://localhost:3000" });
  });

  it("rejects missing or invalid urls", () => {
    expect(() => parseWebEnv({})).toThrow(/VITE_API_URL/);
    expect(() => parseWebEnv({ VITE_API_URL: "ftp://x" })).toThrow(
      /VITE_API_URL/,
    );
  });
});
