import assert from "node:assert/strict";
import test from "node:test";
import {
  CREATE_OUT_OF_STOCK_MESSAGE,
  postChargeOutOfStockMessage,
} from "../messages/stock-messages.ts";

test("create stock copy invites retry", () => {
  assert.match(CREATE_OUT_OF_STOCK_MESSAGE, /try again/i);
  assert.doesNotMatch(CREATE_OUT_OF_STOCK_MESSAGE, /do not try again/i);
});

test("post-charge stock copy forbids retry and surfaces order id", () => {
  const message = postChargeOutOfStockMessage(
    "11111111-2222-3333-4444-555555555555",
  );
  assert.match(message, /do not try again/i);
  assert.match(message, /support/i);
  assert.match(message, /11111111-2222-3333-4444-555555555555/);
  assert.notEqual(CREATE_OUT_OF_STOCK_MESSAGE, message);
});

test("post-charge stock copy falls back when order id is blank", () => {
  assert.match(postChargeOutOfStockMessage("  "), /your order reference/i);
});
