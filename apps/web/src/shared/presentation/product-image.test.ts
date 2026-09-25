import { describe, expect, it } from "vitest";
import { productImageFallback, productImageSrc } from "./product-image";

describe("product-image", () => {
  it("prefers jpg sources and falls back to svg placeholders", () => {
    expect(productImageSrc("/images/lamp.svg")).toBe("/images/lamp.jpg");
    expect(productImageFallback("/images/lamp.jpg")).toBe("/images/lamp.svg");
    expect(productImageFallback("/images/lamp.svg")).toBe("/images/lamp.svg");
  });
});
