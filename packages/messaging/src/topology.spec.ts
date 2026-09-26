import {
  decideRetry,
  PAYMENT_EVENTS_QUEUES,
  readRetryCount,
  RETRY_HEADER,
} from "./topology.js";

describe("topology helpers", () => {
  it("reads x-retry-count from headers", () => {
    expect(readRetryCount(undefined)).toBe(0);
    expect(readRetryCount({ [RETRY_HEADER]: 2 })).toBe(2);
    expect(readRetryCount({ [RETRY_HEADER]: "1" })).toBe(1);
  });

  it("routes to retry while under the max attempts", () => {
    expect(decideRetry(PAYMENT_EVENTS_QUEUES, { [RETRY_HEADER]: 0 })).toEqual({
      action: "retry",
      nextCount: 1,
      queue: PAYMENT_EVENTS_QUEUES.retry,
    });
    expect(decideRetry(PAYMENT_EVENTS_QUEUES, { [RETRY_HEADER]: 2 })).toEqual({
      action: "retry",
      nextCount: 3,
      queue: PAYMENT_EVENTS_QUEUES.retry,
    });
  });

  it("routes to DLQ when attempts are exhausted", () => {
    expect(decideRetry(PAYMENT_EVENTS_QUEUES, { [RETRY_HEADER]: 3 })).toEqual({
      action: "dlq",
      queue: PAYMENT_EVENTS_QUEUES.dlq,
    });
  });
});
