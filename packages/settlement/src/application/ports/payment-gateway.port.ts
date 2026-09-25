import type { TransactionStatus } from "@checkout/contracts";

export type ProviderPayment = {
  providerTransactionId: string;
  status: TransactionStatus;
  /** Merchant reference (our transaction id). Required to bind sync/webhook safely. */
  reference?: string;
  amountInCents?: number;
};

/**
 * Narrow port for settle / void / status polling.
 * Card/widget/token methods stay on the API PaymentGateway.
 */
export abstract class SettlementPaymentGateway {
  abstract getPaymentStatus(
    providerTransactionId: string,
  ): Promise<ProviderPayment>;
  /** Attempt to void an approved card charge (compensation). */
  abstract voidPayment(providerTransactionId: string): Promise<void>;
}
