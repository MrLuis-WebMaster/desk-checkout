/** True when an in-flight create may still apply its response to checkout state. */
export function isCreateStillCurrent(input: {
  epochAtStart: number;
  epochNow: number;
  fingerprintAtStart: string;
  fingerprintNow: string;
}): boolean {
  return (
    input.epochAtStart === input.epochNow &&
    input.fingerprintAtStart === input.fingerprintNow
  );
}
