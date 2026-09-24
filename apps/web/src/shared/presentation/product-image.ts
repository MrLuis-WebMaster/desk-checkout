/**
 * Product image URL as stored (SVG placeholders under `public/products`).
 * After `scripts/fetch-mock-photos.mjs`, prefer JPGs in seed data.
 */
export function productImageSrc(imageUrl: string): string {
  return imageUrl;
}

/** Fallback when a legacy/missing JPG still points at a placeholder SVG. */
export function productImageFallback(imageUrl: string): string {
  if (/\.jpe?g$/i.test(imageUrl)) {
    return imageUrl.replace(/\.jpe?g$/i, ".svg");
  }
  return imageUrl;
}
