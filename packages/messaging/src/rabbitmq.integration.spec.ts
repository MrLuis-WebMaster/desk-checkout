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

describeIntegration("RabbitMQ integration", () => {
  const suffix = `test.${Date.now()}`;
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
    for (let i = 0; i < 50; i += 1) {
      if (manager.isConnected()) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!manager.isConnected()) {
      throw new Error("RabbitMQ did not connect in time");
    }
  }, 20_000);

  afterAll(async () => {
    await manager.stop();
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
  });

  it("publish → consume → ACK", async () => {
    const payload = { hello: "world", n: 1 };
    const received = new Promise<unknown>((resolve) => {
      void manager.consume(queues, async (body) => {
        resolve(body);
      });
    });
    await manager.publish(queues.main, payload);
    await expect(received).resolves.toEqual(payload);
  });

  it("error → DLQ after max retries via handleConsumerFailure", async () => {
    const connection = await amqp.connect(url!);
    const channel = await connection.createConfirmChannel();
    await assertQueueTriplet(
      (queue, options) => channel.assertQueue(queue, options),
      queues,
      { retryTtlMs: 200 },
    );

    const content = Buffer.from(JSON.stringify({ fail: true }), "utf8");
    await handleConsumerFailure({
      queues,
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
        queues.dlq,
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
    await channel.close();
    await connection.close();
  }, 15_000);
});
