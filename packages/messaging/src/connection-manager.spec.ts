import {
  RabbitConnectionManager,
  RabbitUnavailableError,
} from "./connection-manager.js";

describe("RabbitConnectionManager", () => {
  it("throws RabbitUnavailableError when publishing without a channel", async () => {
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
});
