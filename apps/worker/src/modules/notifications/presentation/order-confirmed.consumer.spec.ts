import { ORDER_CONFIRMED_TYPE } from "@checkout/contracts";
import { DeadLetterError } from "@checkout/messaging";
import { OrderConfirmedConsumer } from "./order-confirmed.consumer.js";
import type { NotificationPort } from "../application/ports/notification.port.js";
import type { RabbitConnectionManager } from "@checkout/messaging";

describe("OrderConfirmedConsumer", () => {
  it("calls NotificationPort once for a valid order.confirmed event", async () => {
    let handler: ((payload: unknown) => Promise<void>) | undefined;
    const rabbit = {
      isConnected: () => true,
      consume: jest.fn(async (_queues, cb) => {
        handler = cb;
      }),
    };
    const notifications: NotificationPort = {
      sendOrderConfirmed: jest.fn().mockResolvedValue(undefined),
    };

    const consumer = new OrderConfirmedConsumer(
      rabbit as unknown as RabbitConnectionManager,
      notifications,
    );
    consumer.onModuleInit();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(handler).toBeDefined();
    await handler!({
      eventId: "e1",
      version: 1,
      type: ORDER_CONFIRMED_TYPE,
      transactionId: "t1",
      customerId: "c1",
      deliveryId: "d1",
      occurredAt: "2026-01-01T00:00:00.000Z",
    });

    expect(notifications.sendOrderConfirmed).toHaveBeenCalledTimes(1);
    expect(notifications.sendOrderConfirmed).toHaveBeenCalledWith({
      transactionId: "t1",
      customerId: "c1",
    });
  });

  it("dead-letters unsupported versions without calling the port", async () => {
    let handler: ((payload: unknown) => Promise<void>) | undefined;
    const rabbit = {
      isConnected: () => true,
      consume: jest.fn(async (_queues, cb) => {
        handler = cb;
      }),
    };
    const notifications: NotificationPort = {
      sendOrderConfirmed: jest.fn().mockResolvedValue(undefined),
    };

    const consumer = new OrderConfirmedConsumer(
      rabbit as unknown as RabbitConnectionManager,
      notifications,
    );
    consumer.onModuleInit();
    await new Promise((resolve) => setTimeout(resolve, 10));

    await expect(
      handler!({
        eventId: "e1",
        version: 99,
        type: ORDER_CONFIRMED_TYPE,
        transactionId: "t1",
        customerId: "c1",
        deliveryId: "d1",
        occurredAt: "2026-01-01T00:00:00.000Z",
      }),
    ).rejects.toBeInstanceOf(DeadLetterError);
    expect(notifications.sendOrderConfirmed).not.toHaveBeenCalled();
  });
});
