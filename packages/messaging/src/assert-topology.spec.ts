import {
  assertQueueTriplet,
  PAYMENT_EVENTS_QUEUES,
} from "./topology.js";
import { DeadLetterError, handleConsumerFailure } from "./retry.js";

describe("assertQueueTriplet", () => {
  it("declares main, retry with TTL/DLX, and dlq", async () => {
    const assertQueue = jest.fn().mockResolvedValue(undefined);
    await assertQueueTriplet(assertQueue, PAYMENT_EVENTS_QUEUES, {
      retryTtlMs: 5_000,
    });
    expect(assertQueue).toHaveBeenCalledWith(PAYMENT_EVENTS_QUEUES.main, {
      durable: true,
    });
    expect(assertQueue).toHaveBeenCalledWith(PAYMENT_EVENTS_QUEUES.retry, {
      durable: true,
      arguments: {
        "x-message-ttl": 5_000,
        "x-dead-letter-exchange": "",
        "x-dead-letter-routing-key": PAYMENT_EVENTS_QUEUES.main,
      },
    });
    expect(assertQueue).toHaveBeenCalledWith(PAYMENT_EVENTS_QUEUES.dlq, {
      durable: true,
    });
  });
});

describe("DeadLetterError + immediate DLQ", () => {
  it("routes straight to DLQ when immediateDlq is set", async () => {
    const publish = jest.fn().mockResolvedValue(undefined);
    const ack = jest.fn();
    const content = Buffer.from("{}");
    const action = await handleConsumerFailure({
      queues: PAYMENT_EVENTS_QUEUES,
      message: { content, properties: { headers: {} } },
      publish,
      ack,
      immediateDlq: true,
    });
    expect(action).toBe("dlq");
    expect(publish).toHaveBeenCalledWith(
      PAYMENT_EVENTS_QUEUES.dlq,
      content,
      expect.any(Object),
    );
    expect(new DeadLetterError("unsupported_version").name).toBe(
      "DeadLetterError",
    );
  });
});
