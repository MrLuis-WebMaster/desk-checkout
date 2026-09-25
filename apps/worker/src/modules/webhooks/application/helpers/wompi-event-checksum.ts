import { createHash, timingSafeEqual } from "node:crypto";

export type WompiEventPayload = {
  event: string;
  data: Record<string, unknown>;
  timestamp?: number;
  signature?: {
    properties?: string[];
    checksum?: string;
  };
  sent_at?: string;
};

function resolveProperty(
  data: Record<string, unknown>,
  path: string,
): string {
  const parts = path.split(".");
  let current: unknown = data;
  for (const part of parts) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      return "";
    }
    current = (current as Record<string, unknown>)[part];
  }
  if (current === null || current === undefined) {
    return "";
  }
  return String(current);
}

export function computeWompiEventChecksum(
  event: WompiEventPayload,
  secret: string,
): string {
  const properties = event.signature?.properties ?? [];
  let concatenated = "";
  for (const property of properties) {
    concatenated += resolveProperty(event.data, property);
  }
  concatenated += String(event.timestamp ?? "");
  concatenated += secret;
  return createHash("sha256").update(concatenated).digest("hex");
}

export function verifyWompiEventChecksum(
  event: WompiEventPayload,
  secret: string,
  providedChecksum: string | undefined,
): boolean {
  if (!providedChecksum || providedChecksum.trim().length === 0) {
    return false;
  }
  const calculated = computeWompiEventChecksum(event, secret);
  const left = Buffer.from(calculated.toLowerCase(), "utf8");
  const right = Buffer.from(providedChecksum.trim().toLowerCase(), "utf8");
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function isTimestampWithinSkew(
  timestampSeconds: number | undefined,
  nowMs: number,
  maxSkewSeconds: number,
): boolean {
  if (
    timestampSeconds === undefined ||
    !Number.isFinite(timestampSeconds)
  ) {
    return false;
  }
  const nowSeconds = Math.floor(nowMs / 1000);
  return Math.abs(nowSeconds - timestampSeconds) <= maxSkewSeconds;
}
