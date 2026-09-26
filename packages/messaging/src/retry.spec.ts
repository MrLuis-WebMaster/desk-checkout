import { handleConsumerFailure } from "./retry.js";
import { PAYMENT_EVENTS_QUEUES, RETRY_HEADER } from "./topology.js";

describe("handleConsumerFailure", () => {
  it("publishes to retry and ACKs on first failure", async () => {
    const publish = jest.fn().mockResolvedValue(undefined);
    const ack = jest.fn();
    const content = Buffer.from('{"ok":true}');
    const action = await handleConsumerFailure({
      queues: PAYMENT_EVENTS_QUEUES,
      message: { content, properties: { headers: {} } },
      publish,
      ack,
    });
    expect(action).toBe("retry");
    expect(publish).toHaveBeenCalledWith(
      PAYMENT_EVENTS_QUEUES.retry,
      content,
      expect.objectContaining({
        persistent: true,
        headers: { [RETRY_HEADER]: 1 },
      }),
    );
    expect(ack).toHaveBeenCalled();
  });

  it("publishes to DLQ after max retries", async () => {
    const publish = jest.fn().mockResolvedValue(undefined);
    const ack = jest.fn();
    const content = Buffer.from("{}");
    const action = await handleConsumerFailure({
      queues: PAYMENT_EVENTS_QUEUES,
      message: {
        content,
        properties: { headers: { [RETRY_HEADER]: 3 } },
      },
      publish,
      ack,
    });
    expect(action).toBe("dlq");
    expect(publish).toHaveBeenCalledWith(
      PAYMENT_EVENTS_QUEUES.dlq,
      content,
      expect.objectContaining({ persistent: true }),
    );
    expect(ack).toHaveBeenCalled();
  });
});
