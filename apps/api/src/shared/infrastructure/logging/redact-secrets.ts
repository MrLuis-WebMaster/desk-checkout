const SECRET_ENV_KEYS = [
  "WOMPI_PRIVATE_KEY",
  "WOMPI_INTEGRITY_SECRET",
  "WOMPI_EVENTS_SECRET",
] as const;

/**
 * Redacts known payment secrets and Authorization headers from log strings.
 * Safe to apply to messages and stacks before Logger output.
 */
export function redactSecrets(input: string): string {
  let output = input;
  // Full Authorization header value (any scheme + credentials).
  output = output.replace(
    /Authorization\s*[:=]\s*[^\n,;]+/gi,
    "Authorization: [REDACTED]",
  );
  output = output.replace(/Bearer\s+[^\s"'\\]+/gi, "Bearer [REDACTED]");
  for (const key of SECRET_ENV_KEYS) {
    const value = process.env[key];
    if (value && value.trim().length > 0) {
      output = output.split(value).join(`[REDACTED_${key}]`);
    }
  }
  output = output.replace(/\bprv_[A-Za-z0-9_]+/g, "[REDACTED_PRIVATE_KEY]");
  output = output.replace(
    /\b(WOMPI_PRIVATE_KEY|WOMPI_INTEGRITY_SECRET|WOMPI_EVENTS_SECRET)\s*[:=]\s*\S+/gi,
    "$1=[REDACTED]",
  );
  return output;
}

export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return redactSecrets(error.message);
  }
  return redactSecrets(String(error));
}

export function safeErrorStack(error: unknown): string | undefined {
  if (error instanceof Error && error.stack) {
    return redactSecrets(error.stack);
  }
  return undefined;
}
