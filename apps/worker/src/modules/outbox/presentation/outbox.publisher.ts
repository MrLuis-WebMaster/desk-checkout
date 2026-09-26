import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import {
  ORDER_CONFIRMED_QUEUES,
  RabbitConnectionManager,
  RabbitUnavailableError,
} from "@checkout/messaging";
import { TypeOrmOutboxStore } from "@checkout/settlement-typeorm";
import { env } from "../../../config/env.js";

@Injectable()
export class OutboxPublisher {
  private readonly logger = new Logger(OutboxPublisher.name);
  private running = false;

  constructor(
    private readonly outbox: TypeOrmOutboxStore,
    private readonly rabbit: RabbitConnectionManager,
  ) {}

  @Interval(env.OUTBOX_POLL_MS)
  async tick(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      const claimed = await this.outbox.claimBatch(20);
      for (const row of claimed) {
        try {
          await this.rabbit.publish(ORDER_CONFIRMED_QUEUES.main, row.payload);
          const marked = await this.outbox.markPublished(
            row.id,
            row.lockedUntil,
          );
          if (!marked) {
            this.logger.warn({
              event: "outbox_mark_published_missed",
              outboxId: row.id,
            });
          }
        } catch (error) {
          await this.outbox.releaseOnFailure(row.id, row.lockedUntil);
          this.logger.error({
            event:
              error instanceof RabbitUnavailableError
                ? "outbox_broker_unavailable"
                : "outbox_publish_failed",
            outboxId: row.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } catch (error) {
      this.logger.error({
        event: "outbox_tick_failed",
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.running = false;
    }
  }
}
