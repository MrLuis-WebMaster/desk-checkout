/**
 * Requires a live RabbitMQ. Run with:
 *   RABBITMQ_URL=amqp://guest:guest@localhost:5672 pnpm --filter @checkout/messaging test:integration
 */
import amqp from "amqplib";
import { RabbitConnectionManager } from "./connection-manager.js";
import {
  assertQueueTriplet,
  PAYMENT_EVENTS_QUEUES,
  RETRY_HEADER,
} from "./topology.js";
import { handleConsumerFailure } from "./retry.js";

const url = process.env.RABBITMQ_URL;
const describeIntegration = url ? describe : describe.skip;

async function waitFor(
  predicate: () => boolean,
  {
    timeoutMs = 10_000,
    intervalMs = 50,
    label = "condition",
  }: { timeoutMs?: number; intervalMs?: number; label?: string } = {},
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

describeIntegration("RabbitMQ integration", () => {
  const suffix = `test.${Date.now()}.${process.pid}`;
  const queues = {
    main: `${PAYMENT_EVENTS_QUEUES.main}.${suffix}`,
    retry: `${PAYMENT_EVENTS_QUEUES.retry}.${suffix}`,
    dlq: `${PAYMENT_EVENTS_QUEUES.dlq}.${suffix}`,
  };

  let manager: RabbitConnectionManager;

  beforeAll(async () => {
    manager = new RabbitConnectionManager({
      url: url!,
      queues: [queues],
      reconnectDelayMs: 500,
    });
    manager.start();
    await waitFor(() => manager.isConnected(), {
      timeoutMs: 15_000,
      label: "RabbitMQ connection",
    });
  }, 20_000);

  afterAll(async () => {
    try {
      await manager.stop();
    } catch {
      // ignore
    }
    try {
      const connection = await amqp.connect(url!);
      const channel = await connection.createChannel();
      for (const name of [queues.main, queues.retry, queues.dlq]) {
        try {
          await channel.deleteQueue(name);
        } catch {
          // ignore
        }
      }
      await channel.close();
      await connection.close();
    } catch {
      // ignore cleanup failures so Jest can exit
    }
  }, 20_000);

  it("publish → consume → ACK", async () => {
    const payload = { hello: "world", n: 1 };
    let resolveReceived!: (value: unknown) => void;
    const received = new Promise<unknown>((resolve) => {
      resolveReceived = resolve;
    });
    await manager.consume(queues, async (body) => {
      resolveReceived(body);
    });
    await manager.publish(queues.main, payload);
    await expect(
      Promise.race([
        received,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("consume timeout")), 8_000),
        ),
      ]),
    ).resolves.toEqual(payload);
  }, 15_000);

  it("error → DLQ after max retries via handleConsumerFailure", async () => {
    const connection = await amqp.connect(url!);
    const channel = await connection.createConfirmChannel();
    // Own triplet so we can assert a short TTL without clashing with manager queues.
    const dlqQueues = {
      main: `${queues.main}.dlqcase`,
      retry: `${queues.retry}.dlqcase`,
      dlq: `${queues.dlq}.dlqcase`,
    };
    await assertQueueTriplet(
      (queue, options) => channel.assertQueue(queue, options),
      dlqQueues,
      { retryTtlMs: 200 },
    );

    const content = Buffer.from(JSON.stringify({ fail: true }), "utf8");
    await handleConsumerFailure({
      queues: dlqQueues,
      message: {
        content,
        properties: { headers: { [RETRY_HEADER]: 3 } },
      },
      publish: async (queue, body, options) => {
        channel.publish("", queue, body, {
          persistent: options.persistent,
          headers: options.headers,
          contentType: options.contentType,
        });
        await channel.waitForConfirms();
      },
      ack: () => undefined,
    });

    const dlqMessage = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("DLQ timeout")), 5_000);
      void channel.consume(
        dlqQueues.dlq,
        (message) => {
          if (!message) return;
          clearTimeout(timer);
          channel.ack(message);
          resolve(message.content.toString("utf8"));
        },
        { noAck: false },
      );
    });

    expect(JSON.parse(dlqMessage)).toEqual({ fail: true });
    for (const name of [dlqQueues.main, dlqQueues.retry, dlqQueues.dlq]) {
      try {
        await channel.deleteQueue(name);
      } catch {
        // ignore
      }
    }
    await channel.close();
    await connection.close();
  }, 15_000);
});
