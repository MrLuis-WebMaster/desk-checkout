import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { env } from "../../../config/env.js";
import { ExpireOrphanPendingUseCase } from "../application/use-cases/expire-orphan-pending.use-case.js";
import { ProcessStuckPendingUseCase } from "../application/use-cases/process-stuck-pending.use-case.js";

@Injectable()
export class ReconciliationScheduler {
  private readonly logger = new Logger(ReconciliationScheduler.name);
  private running = false;

  constructor(
    private readonly stuck: ProcessStuckPendingUseCase,
    private readonly orphans: ExpireOrphanPendingUseCase,
  ) {}

  @Interval(env.JOB_INTERVAL_MS)
  async tick(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      const recovered = await this.stuck.execute();
      const expired = await this.orphans.execute();
      if (recovered > 0 || expired > 0) {
        this.logger.log({
          event: "reconciliation_tick",
          recovered,
          expired,
        });
      }
    } catch (error) {
      this.logger.error({
        event: "reconciliation_tick_failed",
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.running = false;
    }
  }
}
