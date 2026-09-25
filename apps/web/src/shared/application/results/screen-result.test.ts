import { describe, expect, it } from "vitest";
import {
  mapApiErrorCode,
  screenMessage,
} from "./screen-result";
import { CREATE_OUT_OF_STOCK_MESSAGE } from "@/shared/application/messages/stock-messages";

describe("screen-result", () => {
  it("maps API error codes", () => {
    expect(mapApiErrorCode("PRODUCT_NOT_FOUND")).toEqual({ status: "not_found" });
    expect(mapApiErrorCode("VALIDATION_ERROR")).toEqual({
      status: "invalid_query",
    });
    expect(mapApiErrorCode("OUT_OF_STOCK")).toEqual({ status: "out_of_stock" });
    expect(mapApiErrorCode("UNEXPECTED")).toEqual({ status: "load_failed" });
  });

  it("returns create-time OOS copy for out_of_stock screens", () => {
    expect(screenMessage({ status: "out_of_stock" })).toBe(
      CREATE_OUT_OF_STOCK_MESSAGE,
    );
    expect(screenMessage({ status: "not_found" })).toMatch(/couldn't find/i);
    expect(screenMessage({ status: "stale" })).toMatch(/changed while creating/i);
  });
});
