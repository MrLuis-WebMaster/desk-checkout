import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Single-writer AC: stock decrement must only go through
 * SettleProviderPaymentService → TransactionWriter.updateAfterPayment.
 */
describe("settlement single-writer surface", () => {
  it("exposes SettleProviderPaymentService as the only settle entry", () => {
    const index = readFileSync(join(__dirname, "../index.ts"), "utf8");
    expect(index).toContain("SettleProviderPaymentService");
    expect(index).not.toMatch(/decrementStock|decrementMany/);
  });

  it("only SettleProviderPaymentService calls updateAfterPayment", () => {
    const settle = readFileSync(
      join(__dirname, "../application/services/settle-provider-payment.ts"),
      "utf8",
    );
    expect(settle).toContain("updateAfterPayment");

    const index = readFileSync(join(__dirname, "../index.ts"), "utf8");
    expect(index).not.toMatch(/updateAfterPayment/);
  });
});
