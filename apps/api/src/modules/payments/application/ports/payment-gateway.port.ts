import type { TransactionStatus } from "@checkout/contracts";
import {
  SettlementPaymentGateway,
  type ProviderPayment,
} from "@checkout/settlement";

export type { ProviderPayment };

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

export type WidgetCheckoutSession = {
  publicKey: string;
  amountInCents: number;
  currency: "COP";
  reference: string;
  signature: string;
};

/** Fat API payment gateway (tokens/card/widget + settle methods). */
export abstract class PaymentGateway extends SettlementPaymentGateway {
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
  abstract voidPayment(providerTransactionId: string): Promise<void>;
}

export type { TransactionStatus };
