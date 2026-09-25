import {
  IdempotencyConflictError,
  IdempotencyStore,
  SettleProviderPaymentService,
  SettlementLogger,
  SettlementPaymentGateway,
  TransactionReader,
  providerPaymentMatchesTransaction,
  toProviderAmountInCents,
  type ProviderPayment,
} from "@checkout/settlement";

export type HandleWompiEventResult =
  | { outcome: "accepted" }
  | { outcome: "ignored"; reason: string };

export type ValidatedWompiTransactionEvent = {
  providerId: string;
  status: ProviderPayment["status"];
  reference?: string;
  amountInCents?: number;
};

export type IdempotencyWaitConfig = {
  attempts: number;
  delayMs: number;
};

const DEFAULT_IDEMPOTENCY_WAIT: IdempotencyWaitConfig = {
  attempts: 40,
  delayMs: 50,
};

export class HandleWompiEventUseCase {
  private readonly wait: IdempotencyWaitConfig;

  constructor(
    private readonly transactions: TransactionReader,
    private readonly idempotency: IdempotencyStore,
    private readonly settlement: SettleProviderPaymentService,
    private readonly gateway: SettlementPaymentGateway,
    private readonly logger: SettlementLogger,
    wait: IdempotencyWaitConfig = DEFAULT_IDEMPOTENCY_WAIT,
  ) {
    this.wait = wait;
  }

  async execute(
    event: ValidatedWompiTransactionEvent,
  ): Promise<HandleWompiEventResult> {
    const { providerId, status: providerStatus, reference, amountInCents } =
      event;

    // Prefer the provider-id binding. `reference` is often unsigned in Wompi
    // checksum properties — never trust it alone for settlement routing.
    let transaction =
      (await this.transactions.findAggregateByProviderId(providerId)) ?? null;

    if (!transaction && reference) {
      const byReference =
        await this.transactions.findAggregateById(reference);
      if (byReference) {
        let providerTruth: ProviderPayment;
        try {
          providerTruth = await this.gateway.getPaymentStatus(providerId);
        } catch {
          this.logger.log("webhook_accepted", {
            reason: "provider_lookup_failed",
            providerId,
            reference,
          });
          return { outcome: "ignored", reason: "provider_lookup_failed" };
        }
        if (!providerPaymentMatchesTransaction(providerTruth, byReference)) {
          this.logger.log("webhook_accepted", {
            reason: "reference_mismatch",
            transactionId: byReference.id,
            providerId,
            reference,
          });
          return { outcome: "ignored", reason: "reference_mismatch" };
        }
        if (
          byReference.hasProviderCharge() &&
          byReference.providerTransactionId !== providerId
        ) {
          this.logger.log("webhook_accepted", {
            reason: "provider_mismatch",
            transactionId: byReference.id,
            providerId,
          });
          return { outcome: "ignored", reason: "provider_mismatch" };
        }
        transaction = byReference;
      }
    }

    if (!transaction) {
      this.logger.log("webhook_accepted", {
        reason: "transaction_not_found",
        providerId,
        reference,
      });
      return { outcome: "ignored", reason: "transaction_not_found" };
    }

    if (reference && reference !== transaction.id) {
      this.logger.log("webhook_accepted", {
        reason: "reference_mismatch",
        transactionId: transaction.id,
        providerId,
        reference,
      });
      return { outcome: "ignored", reason: "reference_mismatch" };
    }

    if (
      typeof amountInCents !== "number" ||
      amountInCents !== toProviderAmountInCents(transaction.total)
    ) {
      this.logger.log("webhook_accepted", {
        reason: "amount_mismatch",
        transactionId: transaction.id,
        providerId,
        amountInCents,
        expected: toProviderAmountInCents(transaction.total),
      });
      return { outcome: "ignored", reason: "amount_mismatch" };
    }

    const idempotencyKey = `webhook:${providerId}:${providerStatus}`;
    const existing = await this.idempotency.find(idempotencyKey);
    if (existing?.response || existing?.errorCode) {
      this.logger.log("webhook_accepted", {
        reason: "idempotent_replay",
        transactionId: transaction.id,
        providerId,
      });
      return { outcome: "accepted" };
    }

    if (existing) {
      const terminal = await this.waitForIdempotencyTerminal(idempotencyKey);
      if (terminal === "complete") {
        this.logger.log("webhook_accepted", {
          reason: "idempotent_race",
          transactionId: transaction.id,
          providerId,
        });
        return { outcome: "accepted" };
      }
      // Still nonterminal (crash mid-settle) or aborted — reclaim and settle.
      await this.idempotency.abort(idempotencyKey);
      this.logger.log("webhook_accepted", {
        reason: "idempotent_reclaimed",
        transactionId: transaction.id,
        providerId,
      });
    }

    try {
      await this.idempotency.begin(
        idempotencyKey,
        transaction.id,
        idempotencyKey,
      );
    } catch (error) {
      if (error instanceof IdempotencyConflictError) {
        const terminal = await this.waitForIdempotencyTerminal(idempotencyKey);
        if (terminal === "complete") {
          this.logger.log("webhook_accepted", {
            reason: "idempotent_race",
            transactionId: transaction.id,
            providerId,
          });
          return { outcome: "accepted" };
        }
        await this.idempotency.abort(idempotencyKey);
        try {
          await this.idempotency.begin(
            idempotencyKey,
            transaction.id,
            idempotencyKey,
          );
        } catch (retryError) {
          if (retryError instanceof IdempotencyConflictError) {
            // Another worker won the reclaim race — do not ACK a nonterminal key.
            throw new Error(
              `webhook_idempotency_in_flight:${idempotencyKey}`,
            );
          }
          throw retryError;
        }
      } else {
        throw error;
      }
    }

    await this.settlement.settle(
      transaction,
      {
        providerTransactionId: providerId,
        status: providerStatus,
        reference: transaction.id,
        amountInCents,
      },
      idempotencyKey,
      "webhook",
    );

    this.logger.log("webhook_accepted", {
      transactionId: transaction.id,
      providerId,
      status: providerStatus,
    });
    return { outcome: "accepted" };
  }

  private async waitForIdempotencyTerminal(
    key: string,
  ): Promise<"complete" | "gone" | "pending"> {
    let last: "complete" | "gone" | "pending" = "pending";
    for (let attempt = 0; attempt < this.wait.attempts; attempt += 1) {
      const record = await this.idempotency.find(key);
      if (!record) {
        last = "gone";
        return last;
      }
      if (record.response || record.errorCode) {
        return "complete";
      }
      last = "pending";
      if (this.wait.delayMs > 0) {
        await delay(this.wait.delayMs);
      }
    }
    return last;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
