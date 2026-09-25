import {
  SettlementLogger,
  TransactionReader,
  TransactionWriter,
} from "@checkout/settlement";

export class ExpireOrphanPendingUseCase {
  constructor(
    private readonly transactions: TransactionReader,
    private readonly writer: TransactionWriter,
    private readonly logger: SettlementLogger,
    private readonly orphanPendingTtlMs: number,
  ) {}

  async execute(now = new Date()): Promise<number> {
    const olderThan = new Date(now.getTime() - this.orphanPendingTtlMs);
    const orphans = await this.transactions.listOrphanPending(olderThan);
    let expired = 0;

    for (const transaction of orphans) {
      let expiredAggregate;
      try {
        expiredAggregate = transaction.expireUncharged();
      } catch {
        continue;
      }
      const won = await this.writer.expireUncharged(expiredAggregate);
      if (!won) {
        continue;
      }
      expired += 1;
      this.logger.log("orphan_expired", {
        transactionId: transaction.id,
      });
    }

    return expired;
  }
}
