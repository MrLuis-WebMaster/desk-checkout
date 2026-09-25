import {
  IdempotencyConflictError,
  IdempotencyStore,
  SettleProviderPaymentService,
  SettlementLogger,
  SettlementPaymentGateway,
  TransactionReader,
  providerPaymentMatchesTransaction,
} from "@checkout/settlement";

export class ProcessStuckPendingUseCase {
  constructor(
    private readonly transactions: TransactionReader,
    private readonly gateway: SettlementPaymentGateway,
    private readonly idempotency: IdempotencyStore,
    private readonly settlement: SettleProviderPaymentService,
    private readonly logger: SettlementLogger,
    private readonly stuckPendingAfterMs: number,
  ) {}

  async execute(now = new Date()): Promise<number> {
    const olderThan = new Date(now.getTime() - this.stuckPendingAfterMs);
    const stuck = await this.transactions.listStuckPending(olderThan);
    let recovered = 0;

    for (const transaction of stuck) {
      const providerId = transaction.providerTransactionId;
      if (!providerId) {
        continue;
      }

      let provider;
      try {
        provider = await this.gateway.getPaymentStatus(providerId);
      } catch {
        this.logger.log("stuck_recovered", {
          ok: false,
          transactionId: transaction.id,
          providerId,
          reason: "provider_lookup_failed",
        });
        continue;
      }

      if (!providerPaymentMatchesTransaction(provider, transaction)) {
        this.logger.log("stuck_recovered", {
          ok: false,
          transactionId: transaction.id,
          providerId,
          reason: "provider_binding_mismatch",
        });
        continue;
      }

      const idempotencyKey = `stuck:${providerId}:${provider.status}`;
      const existing = await this.idempotency.find(idempotencyKey);
      if (existing?.response || existing?.errorCode) {
        continue;
      }

      try {
        await this.idempotency.begin(
          idempotencyKey,
          transaction.id,
          idempotencyKey,
        );
      } catch (error) {
        if (error instanceof IdempotencyConflictError) {
          continue;
        }
        throw error;
      }

      await this.settlement.settle(
        transaction,
        provider,
        idempotencyKey,
        "stuck_job",
      );
      recovered += 1;
      this.logger.log("stuck_recovered", {
        transactionId: transaction.id,
        providerId,
        status: provider.status,
      });
    }

    return recovered;
  }
}
