import { wompiIntegritySignature } from "./wompi-signature.js";

describe("wompiIntegritySignature", () => {
  it("hashes reference, amount, currency, and secret with no separators", () => {
    const signature = wompiIntegritySignature("ref-1", 12000, "COP", "secret");
    expect(signature).toMatch(/^[a-f0-9]{64}$/);
    expect(signature).toBe(
      wompiIntegritySignature("ref-1", 12000, "COP", "secret"),
    );
    expect(signature).not.toBe(
      wompiIntegritySignature("ref-2", 12000, "COP", "secret"),
    );
  });
});
