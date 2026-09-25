import assert from "node:assert/strict";
import test from "node:test";
import {
  CREATE_OUT_OF_STOCK_MESSAGE,
  POST_CHARGE_OUT_OF_STOCK_MESSAGE,
} from "../messages/stock-messages.ts";

test("create stock copy invites retry", () => {
  assert.match(CREATE_OUT_OF_STOCK_MESSAGE, /try again/i);
  assert.doesNotMatch(CREATE_OUT_OF_STOCK_MESSAGE, /do not try again/i);
});

test("post-charge stock copy forbids retry", () => {
  assert.match(POST_CHARGE_OUT_OF_STOCK_MESSAGE, /do not try again/i);
  assert.match(POST_CHARGE_OUT_OF_STOCK_MESSAGE, /support/i);
  assert.notEqual(CREATE_OUT_OF_STOCK_MESSAGE, POST_CHARGE_OUT_OF_STOCK_MESSAGE);
});
