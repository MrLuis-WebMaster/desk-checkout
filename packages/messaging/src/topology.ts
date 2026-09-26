export const RETRY_HEADER = "x-retry-count";
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_TTL_MS = 5_000;

export type QueueTriplet = {
  main: string;
  retry: string;
  dlq: string;
};

export const PAYMENT_EVENTS_QUEUES: QueueTriplet = {
  main: "payment.events",
  retry: "payment.events.retry",
  dlq: "payment.events.dlq",
};

export const ORDER_CONFIRMED_QUEUES: QueueTriplet = {
  main: "order.confirmed",
  retry: "order.confirmed.retry",
  dlq: "order.confirmed.dlq",
};

export type AssertQueueFn = (
  queue: string,
  options?: {
    durable?: boolean;
    arguments?: Record<string, unknown>;
  },
) => Promise<unknown>;

/** Declares the main / retry / DLQ triplet. Must be identical on every app. */
export async function assertQueueTriplet(
  assertQueue: AssertQueueFn,
  queues: QueueTriplet,
  options: { retryTtlMs?: number } = {},
): Promise<void> {
  const retryTtlMs = options.retryTtlMs ?? RETRY_TTL_MS;
  await assertQueue(queues.main, { durable: true });
  await assertQueue(queues.retry, {
    durable: true,
    arguments: {
      "x-message-ttl": retryTtlMs,
      "x-dead-letter-exchange": "",
      "x-dead-letter-routing-key": queues.main,
    },
  });
  await assertQueue(queues.dlq, { durable: true });
}

export function readRetryCount(
  headers: Record<string, unknown> | undefined,
): number {
  const raw = headers?.[RETRY_HEADER];
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
    return Math.floor(raw);
  }
  if (typeof raw === "string" && raw.trim().length > 0) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.floor(parsed);
    }
  }
  return 0;
}

export type RetryDecision =
  | { action: "retry"; nextCount: number; queue: string }
  | { action: "dlq"; queue: string };

export function decideRetry(
  queues: QueueTriplet,
  headers: Record<string, unknown> | undefined,
  maxAttempts: number = MAX_RETRY_ATTEMPTS,
): RetryDecision {
  const count = readRetryCount(headers);
  if (count < maxAttempts) {
    return {
      action: "retry",
      nextCount: count + 1,
      queue: queues.retry,
    };
  }
  return { action: "dlq", queue: queues.dlq };
}
