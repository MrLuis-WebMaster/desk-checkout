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

export type WidgetCheckoutSession = {
  publicKey: string;
  amountInCents: number;
  currency: "COP";
  reference: string;
  signature: string;
};

export abstract class PaymentGateway {
  abstract getAcceptanceTokens(): Promise<AcceptanceTokens>;
  abstract createCardPayment(input: CardPaymentInput): Promise<ProviderPayment>;
  abstract createWidgetSession(input: {
    reference: string;
    amountInCents: number;
    currency: "COP";
  }): WidgetCheckoutSession;
  abstract getPaymentStatus(
    providerTransactionId: string,
  ): Promise<ProviderPayment>;
}
