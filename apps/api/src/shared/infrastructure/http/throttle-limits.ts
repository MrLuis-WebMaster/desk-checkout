import { seconds } from "@nestjs/throttler";

/** Stricter limits for guest checkout mutation/read-by-id routes. */
export const STRICT_THROTTLE = {
  default: { limit: 20, ttl: seconds(60) },
} as const;

/** Generous default used by ThrottlerModule.forRoot. */
export const DEFAULT_THROTTLE = {
  name: "default" as const,
  ttl: seconds(60),
  limit: 120,
};
