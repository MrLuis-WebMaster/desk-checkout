import { OutboxPublisher } from "./outbox.publisher.js";
import type { TypeOrmOutboxStore } from "@checkout/settlement-typeorm";
import type { RabbitConnectionManager } from "@checkout/messaging";
import { RabbitUnavailableError } from "@checkout/messaging";

describe("OutboxPublisher", () => {
  const lockedUntil = new Date("2026-01-01T00:00:30.000Z");
  const outbox = {
    claimBatch: jest.fn(),
    markPublished: jest.fn(),
    releaseOnFailure: jest.fn(),
  };
  const rabbit = {
    publish: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("publishes claimed rows and marks published_at", async () => {
    outbox.claimBatch.mockResolvedValue([
      {
        id: "o1",
        type: "order.confirmed",
        aggregateId: "t1",
        payload: { eventId: "e1" },
        lockedUntil,
      },
    ]);
    outbox.markPublished.mockResolvedValue(true);
    rabbit.publish.mockResolvedValue(undefined);

    const publisher = new OutboxPublisher(
      outbox as unknown as TypeOrmOutboxStore,
      rabbit as unknown as RabbitConnectionManager,
    );
    await publisher.tick();

    expect(rabbit.publish).toHaveBeenCalledWith("order.confirmed", {
      eventId: "e1",
    });
    expect(outbox.markPublished).toHaveBeenCalledWith("o1", lockedUntil);
  });

  it("releases the lease when the broker is down", async () => {
    outbox.claimBatch.mockResolvedValue([
      {
        id: "o1",
        type: "order.confirmed",
        aggregateId: "t1",
        payload: { eventId: "e1" },
        lockedUntil,
      },
    ]);
    rabbit.publish.mockRejectedValue(new RabbitUnavailableError());

    const publisher = new OutboxPublisher(
      outbox as unknown as TypeOrmOutboxStore,
      rabbit as unknown as RabbitConnectionManager,
    );
    await publisher.tick();

    expect(outbox.markPublished).not.toHaveBeenCalled();
    expect(outbox.releaseOnFailure).toHaveBeenCalledWith("o1", lockedUntil);
  });
});
