import { decideRetry, RETRY_HEADER, type QueueTriplet } from "./topology.js";

export type PublishFn = (
  queue: string,
  content: Buffer,
  options: {
    persistent: boolean;
    headers?: Record<string, unknown>;
    contentType?: string;
  },
) => Promise<void>;

export type AckFn = (message: ConsumedMessage) => void;

export type ConsumedMessage = {
  content: Buffer;
  properties: {
    headers?: Record<string, unknown>;
  };
};

export type MessageHandler = (message: ConsumedMessage) => Promise<void>;

/** Throw from a handler to skip retries and land in the DLQ immediately. */
export class DeadLetterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeadLetterError";
  }
}

/**
 * After a handler failure: publish to retry or DLQ (with confirms), then ACK
 * the original. Callers must only ACK after this succeeds; if publish fails,
 * keep/requeue the original so payment events are never dropped.
 */
export async function handleConsumerFailure(input: {
  queues: QueueTriplet;
  message: ConsumedMessage;
  publish: PublishFn;
  ack: AckFn;
  maxAttempts?: number;
  immediateDlq?: boolean;
}): Promise<"retry" | "dlq"> {
  const decision = input.immediateDlq
    ? { action: "dlq" as const, queue: input.queues.dlq }
    : decideRetry(
        input.queues,
        input.message.properties.headers,
        input.maxAttempts,
      );
  const headers: Record<string, unknown> = {
    ...(input.message.properties.headers ?? {}),
  };
  if (decision.action === "retry") {
    headers[RETRY_HEADER] = decision.nextCount;
  }
  await input.publish(decision.queue, input.message.content, {
    persistent: true,
    headers,
    contentType: "application/json",
  });
  input.ack(input.message);
  return decision.action;
}
