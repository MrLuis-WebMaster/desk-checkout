import {
  SettlementPaymentGateway,
  type ProviderPayment,
} from "@checkout/settlement";
import { mapWompiStatus } from "./map-wompi-status.js";

class PaymentGatewayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentGatewayError";
  }
}

type WompiTransactionBody = {
  data?: {
    id?: string;
    status?: string;
    reference?: string;
    amount_in_cents?: number;
    transaction?: {
      id?: string;
      status?: string;
      reference?: string;
      amount_in_cents?: number;
    };
  };
};

/** Worker Wompi adapter — implements settle port only. */
export class WompiHttpPaymentGateway extends SettlementPaymentGateway {
  constructor(
    private readonly baseUrl: string,
    private readonly privateKey: string,
  ) {
    super();
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

  async voidPayment(providerTransactionId: string): Promise<void> {
    await this.request<WompiTransactionBody>(
      `/transactions/${providerTransactionId}/void`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${this.privateKey}` },
      },
    );
  }

  private toProviderPayment(body: WompiTransactionBody): ProviderPayment {
    const nested = body.data?.transaction;
    const id = body.data?.id ?? nested?.id;
    const status = body.data?.status ?? nested?.status;
    const reference = body.data?.reference ?? nested?.reference;
    const amountInCents = body.data?.amount_in_cents ?? nested?.amount_in_cents;
    if (!id) {
      throw new PaymentGatewayError("Wompi transaction id is missing");
    }
    try {
      return {
        providerTransactionId: id,
        status: mapWompiStatus(status),
        reference,
        amountInCents:
          typeof amountInCents === "number" ? amountInCents : undefined,
      };
    } catch (error) {
      throw new PaymentGatewayError(
        error instanceof Error ? error.message : "Unsupported Wompi status",
      );
    }
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
    const text = await response.text();
    if (!text.trim()) {
      return {} as T;
    }
    return JSON.parse(text) as T;
  }
}
