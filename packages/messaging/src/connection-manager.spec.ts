import amqp from "amqplib";
import {
  RabbitConnectionManager,
  RabbitUnavailableError,
} from "./connection-manager.js";
import { PAYMENT_EVENTS_QUEUES } from "./topology.js";

jest.mock("amqplib", () => ({
  __esModule: true,
  default: {
    connect: jest.fn(),
  },
}));

const connectMock = amqp.connect as jest.MockedFunction<typeof amqp.connect>;

type FakeChannel = {
  assertQueue: jest.Mock;
  prefetch: jest.Mock;
  consume: jest.Mock;
  publish: jest.Mock;
  waitForConfirms: jest.Mock;
  close: jest.Mock;
  once: jest.Mock;
  ack: jest.Mock;
  nack: jest.Mock;
};

type FakeConnection = {
  createConfirmChannel: jest.Mock;
  on: jest.Mock;
  close: jest.Mock;
};

function createFakeSocket() {
  const channel: FakeChannel = {
    assertQueue: jest.fn(async () => undefined),
    prefetch: jest.fn(async () => undefined),
    consume: jest.fn(async () => ({ consumerTag: "ctag" })),
    publish: jest.fn(() => true),
    waitForConfirms: jest.fn(async () => undefined),
    close: jest.fn(async () => undefined),
    once: jest.fn(),
    ack: jest.fn(),
    nack: jest.fn(),
  };
  const connection: FakeConnection = {
    createConfirmChannel: jest.fn(async () => channel),
    on: jest.fn(),
    close: jest.fn(async () => undefined),
  };
  return { connection, channel };
}

async function waitFor(predicate: () => boolean, timeoutMs = 2_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("waitFor timed out");
}

describe("RabbitConnectionManager", () => {
  beforeEach(() => {
    connectMock.mockReset();
  });

  it("throws RabbitUnavailableError when publishing without a channel", async () => {
    connectMock.mockImplementation(() => new Promise(() => undefined));
    const manager = new RabbitConnectionManager({
      url: "amqp://localhost:5672",
      reconnectDelayMs: 60_000,
    });
    await expect(manager.publish("payment.events", { a: 1 })).rejects.toBeInstanceOf(
      RabbitUnavailableError,
    );
    await manager.stop();
  });

  it("start does not throw when the broker is unreachable", async () => {
    connectMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const manager = new RabbitConnectionManager({
      url: "amqp://127.0.0.1:1",
      reconnectDelayMs: 60_000,
      logger: { info: jest.fn(), error: jest.fn() },
    });
    expect(() => manager.start()).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(manager.isConnected()).toBe(false);
    await manager.stop();
  });

  it("re-registers consumers after a reconnect", async () => {
    const first = createFakeSocket();
    const second = createFakeSocket();
    connectMock
      .mockResolvedValueOnce(first.connection as never)
      .mockResolvedValueOnce(second.connection as never);

    const info = jest.fn();
    const manager = new RabbitConnectionManager({
      url: "amqp://localhost:5672",
      reconnectDelayMs: 20,
      queues: [PAYMENT_EVENTS_QUEUES],
      logger: { info, error: jest.fn() },
    });
    manager.start();
    await waitFor(() => manager.isConnected());

    const handler = jest.fn(async () => undefined);
    await manager.consume(PAYMENT_EVENTS_QUEUES, handler);
    expect(first.channel.consume).toHaveBeenCalledWith(
      PAYMENT_EVENTS_QUEUES.main,
      expect.any(Function),
      { noAck: false },
    );

    const closeHandler = first.connection.on.mock.calls.find(
      (call) => call[0] === "close",
    )?.[1] as (() => void) | undefined;
    expect(typeof closeHandler).toBe("function");
    closeHandler!();

    await waitFor(() => second.channel.consume.mock.calls.length > 0);
    expect(second.channel.consume).toHaveBeenCalledWith(
      PAYMENT_EVENTS_QUEUES.main,
      expect.any(Function),
      { noAck: false },
    );
    expect(info).toHaveBeenCalledWith(
      "rabbit_consumer_rebound",
      expect.objectContaining({ queue: PAYMENT_EVENTS_QUEUES.main }),
    );

    await manager.stop();
  });
});
