import { Injectable } from "@nestjs/common";
import { TransactionStatus } from "@checkout/contracts";
import { env } from "#config/env.js";
import { PaymentGatewayError } from "../../domain/payment/errors.js";
import {
  PaymentGateway,
  type AcceptanceTokens,
  type CardPaymentInput,
  type ProviderPayment,
  type WidgetCheckoutSession,
} from "../../application/ports/payment-gateway.port.js";
import { wompiIntegritySignature } from "./wompi-signature.js";

type WompiTransactionBody = {
  data?: {
    id?: string;
    status?: string;
  };
};

type MerchantInfoBody = {
  data?: {
    presigned_acceptance?: {
      acceptance_token?: string;
      type?: string;
    };
    presigned_personal_data_auth?: {
      acceptance_token?: string;
      type?: string;
    };
  };
};

@Injectable()
export class WompiHttpPaymentGateway extends PaymentGateway {
  private readonly baseUrl = env.WOMPI_BASE_URL;
  private readonly publicKey = env.WOMPI_PUBLIC_KEY;
  private readonly privateKey = env.WOMPI_PRIVATE_KEY;
  private readonly integritySecret = env.WOMPI_INTEGRITY_SECRET;

  async getAcceptanceTokens(): Promise<AcceptanceTokens> {
    const body = await this.request<MerchantInfoBody>("/merchants/info", {
      headers: { "x-merchant-public-key": this.publicKey },
    });
    const acceptance = body.data?.presigned_acceptance;
    const personal = body.data?.presigned_personal_data_auth;
    if (!acceptance?.acceptance_token || !personal?.acceptance_token) {
      throw new PaymentGatewayError("Wompi acceptance tokens are missing");
    }
    return {
      publicKey: this.publicKey,
      acceptanceToken: acceptance.acceptance_token,
      acceptanceTokenType: acceptance.type ?? "END_USER_POLICY",
      acceptPersonalAuth: personal.acceptance_token,
      acceptPersonalAuthType: personal.type ?? "PERSONAL_DATA_AUTH",
    };
  }

  async createCardPayment(input: CardPaymentInput): Promise<ProviderPayment> {
    const signature = wompiIntegritySignature(
      input.reference,
      input.amountInCents,
      input.currency,
      this.integritySecret,
    );
    const body = await this.request<WompiTransactionBody>("/transactions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.privateKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        acceptance_token: input.acceptanceToken,
        accept_personal_auth: input.acceptPersonalAuth,
        amount_in_cents: input.amountInCents,
        currency: input.currency,
        signature,
        customer_email: input.customerEmail,
        reference: input.reference,
        payment_method: {
          type: "CARD",
          token: input.paymentMethodToken,
          installments: input.installments,
        },
      }),
    });
    return this.toProviderPayment(body);
  }

  createWidgetSession(input: {
    reference: string;
    amountInCents: number;
    currency: "COP";
  }): WidgetCheckoutSession {
    return {
      publicKey: this.publicKey,
      amountInCents: input.amountInCents,
      currency: input.currency,
      reference: input.reference,
      signature: wompiIntegritySignature(
        input.reference,
        input.amountInCents,
        input.currency,
        this.integritySecret,
      ),
    };
  }

  async getPaymentStatus(
    providerTransactionId: string,
  ): Promise<ProviderPayment> {
    const body = await this.request<WompiTransactionBody>(
      `/transactions/${providerTransactionId}`,
      { headers: { Authorization: `Bearer ${this.privateKey}` } },
    );
    return this.toProviderPayment(body);
  }

  private toProviderPayment(body: WompiTransactionBody): ProviderPayment {
    const id = body.data?.id;
    if (!id) {
      throw new PaymentGatewayError("Wompi transaction id is missing");
    }
    return {
      providerTransactionId: id,
      status: mapWompiStatus(body.data?.status),
    };
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new PaymentGatewayError(
        `Wompi request failed with status ${response.status}`,
      );
    }
    return (await response.json()) as T;
  }
}

export function mapWompiStatus(status: string | undefined): TransactionStatus {
  switch (status) {
    case "APPROVED":
      return TransactionStatus.Approved;
    case "DECLINED":
      return TransactionStatus.Declined;
    case "PENDING":
      return TransactionStatus.Pending;
    case "VOIDED":
    case "ERROR":
      return TransactionStatus.Error;
    default:
      throw new PaymentGatewayError(
        `Unsupported Wompi status: ${status ?? "missing"}`,
      );
  }
}
