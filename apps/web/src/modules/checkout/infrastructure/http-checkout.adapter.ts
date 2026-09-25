import type {
  CheckoutSettingsDto,
  CreateTransactionRequest,
  PaymentConfigDto,
  PayTransactionRequest,
  ShippingCityCode,
  ShippingMethodQuoteDto,
  SyncProviderPaymentRequest,
  TransactionDto,
  WidgetCheckoutSessionDto,
} from "@checkout/contracts";
import { toScreenResult } from "@/shared/application/mappers/to-screen-result";
import type { ScreenResult } from "@/shared/application/results/screen-result";
import { apiClient } from "@/shared/infrastructure/http/api-client";
import { PaymentPort } from "../application/ports/payment.port";
import { ShippingPort } from "../application/ports/shipping.port";
import { TransactionPort } from "../application/ports/transaction.port";

export class HttpPaymentAdapter extends PaymentPort {
  async getPaymentConfig(
    signal?: AbortSignal,
  ): Promise<ScreenResult<PaymentConfigDto>> {
    const result = await apiClient.get<PaymentConfigDto>("/payments/config", {
      signal,
    });
    return toScreenResult(result);
  }
}

export class HttpShippingAdapter extends ShippingPort {
  async getCheckoutSettings(
    signal?: AbortSignal,
  ): Promise<ScreenResult<CheckoutSettingsDto>> {
    const result = await apiClient.get<CheckoutSettingsDto>(
      "/checkout/settings",
      { signal },
    );
    return toScreenResult(result);
  }

  async listShippingQuotes(
    city: ShippingCityCode,
    signal?: AbortSignal,
  ): Promise<ScreenResult<ShippingMethodQuoteDto[]>> {
    const result = await apiClient.get<ShippingMethodQuoteDto[]>(
      "/shipping-methods",
      { query: { city }, signal },
    );
    return toScreenResult(result);
  }
}

export class HttpTransactionAdapter extends TransactionPort {
  async createTransaction(
    request: CreateTransactionRequest,
    signal?: AbortSignal,
  ): Promise<ScreenResult<TransactionDto>> {
    const result = await apiClient.post<TransactionDto>(
      "/transactions",
      request,
      { signal },
    );
    return toScreenResult(result);
  }

  async payTransaction(
    transactionId: string,
    request: PayTransactionRequest,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<ScreenResult<TransactionDto>> {
    const result = await apiClient.post<TransactionDto>(
      `/transactions/${transactionId}/pay`,
      request,
      {
        headers: { "Idempotency-Key": idempotencyKey },
        signal,
      },
    );
    return toScreenResult(result);
  }

  async getWidgetSession(
    transactionId: string,
    signal?: AbortSignal,
  ): Promise<ScreenResult<WidgetCheckoutSessionDto>> {
    const result = await apiClient.get<WidgetCheckoutSessionDto>(
      `/transactions/${transactionId}/widget-session`,
      { signal },
    );
    return toScreenResult(result);
  }

  async syncProviderPayment(
    transactionId: string,
    request: SyncProviderPaymentRequest,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<ScreenResult<TransactionDto>> {
    const result = await apiClient.post<TransactionDto>(
      `/transactions/${transactionId}/sync`,
      request,
      {
        headers: { "Idempotency-Key": idempotencyKey },
        signal,
      },
    );
    return toScreenResult(result);
  }

  async getTransaction(
    transactionId: string,
    signal?: AbortSignal,
  ): Promise<ScreenResult<TransactionDto>> {
    const result = await apiClient.get<TransactionDto>(
      `/transactions/${transactionId}`,
      { signal },
    );
    return toScreenResult(result);
  }
}
