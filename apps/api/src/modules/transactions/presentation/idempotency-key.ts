import { HttpStatus } from "@nestjs/common";
import { ApiErrorCode } from "@checkout/contracts";
import { throwApiError } from "#shared/presentation/http/throw-api-error.js";

export const IDEMPOTENCY_KEY_MAX_LENGTH = 200;

/** Validates and returns the Idempotency-Key header, or throws an API error. */
export function requireIdempotencyKey(
  idempotencyKey: string | undefined,
): string {
  const key = idempotencyKey?.trim();
  if (!key) {
    throwApiError(
      ApiErrorCode.ValidationError,
      "Idempotency-Key header is required",
      HttpStatus.BAD_REQUEST,
    );
  }
  if (key.length > IDEMPOTENCY_KEY_MAX_LENGTH) {
    throwApiError(
      ApiErrorCode.ValidationError,
      `Idempotency-Key must be at most ${IDEMPOTENCY_KEY_MAX_LENGTH} characters`,
      HttpStatus.BAD_REQUEST,
    );
  }
  return key;
}
