/**
 * Prefer the JPG mock photo. The database may still store the SVG placeholder.
 */
export function productImageSrc(imageUrl: string): string {
  return imageUrl.replace(/\.svg$/i, ".jpg");
}

/** Fallback when a legacy/missing JPG still points at a placeholder SVG. */
export function productImageFallback(imageUrl: string): string {
  if (/\.jpe?g$/i.test(imageUrl)) {
    return imageUrl.replace(/\.jpe?g$/i, ".svg");
  }
  return imageUrl;
}
