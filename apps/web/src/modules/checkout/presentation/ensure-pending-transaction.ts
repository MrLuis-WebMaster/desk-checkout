/**
 * Shared in-flight create so card pay and widget share one PENDING create.
 * Concurrent callers await the same promise; after success, getExisting short-circuits.
 */
export function createSharedCreate<T>(options: {
  getExisting: () => T | null | undefined;
  create: () => Promise<T>;
}): {
  ensure: () => Promise<T>;
} {
  let inFlight: Promise<T> | null = null;

  return {
    async ensure(): Promise<T> {
      const existing = options.getExisting();
      if (existing != null) {
        return existing;
      }
      if (inFlight) {
        return inFlight;
      }
      inFlight = (async () => {
        try {
          return await options.create();
        } finally {
          inFlight = null;
        }
      })();
      return inFlight;
    },
  };
}
