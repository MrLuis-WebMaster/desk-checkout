import type { TransactionStatus } from "@checkout/contracts";

export type AcceptanceTokens = {
  publicKey: string;
  acceptanceToken: string;
  acceptanceTokenType: string;
  acceptPersonalAuth: string;
  acceptPersonalAuthType: string;
};

export type CardPaymentInput = {
  reference: string;
  amountInCents: number;
  currency: "COP";
  paymentMethodToken: string;
  acceptanceToken: string;
  acceptPersonalAuth: string;
  installments: number;
  customerEmail: string;
};

export type ProviderPayment = {
  providerTransactionId: string;
  status: TransactionStatus;
};

export abstract class PaymentGateway {
  abstract getAcceptanceTokens(): Promise<AcceptanceTokens>;
  abstract createCardPayment(input: CardPaymentInput): Promise<ProviderPayment>;
  abstract getPaymentStatus(
    providerTransactionId: string,
  ): Promise<ProviderPayment>;
}
