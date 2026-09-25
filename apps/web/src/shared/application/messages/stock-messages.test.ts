import { describe, expect, it } from "vitest";
import {
  CREATE_OUT_OF_STOCK_MESSAGE,
  postChargeOutOfStockMessage,
} from "./stock-messages";

describe("stock-messages", () => {
  it("create stock copy invites retry", () => {
    expect(CREATE_OUT_OF_STOCK_MESSAGE).toMatch(/try again/i);
    expect(CREATE_OUT_OF_STOCK_MESSAGE).not.toMatch(/do not try again/i);
  });

  it("post-charge stock copy forbids retry and surfaces order id", () => {
    const message = postChargeOutOfStockMessage(
      "11111111-2222-3333-4444-555555555555",
    );
    expect(message).toMatch(/do not try again/i);
    expect(message).toMatch(/support/i);
    expect(message).toMatch(/11111111-2222-3333-4444-555555555555/);
    expect(message).not.toEqual(CREATE_OUT_OF_STOCK_MESSAGE);
  });

  it("post-charge stock copy falls back when order id is blank", () => {
    expect(postChargeOutOfStockMessage("  ")).toMatch(/your order reference/i);
  });
});
