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
import type { ScreenResult } from "@/shared/application/results/screen-result";
import {
  HttpPaymentAdapter,
  HttpShippingAdapter,
  HttpTransactionAdapter,
} from "../infrastructure/http-checkout.adapter";
import {
  newIdempotencyKey as createIdempotencyKey,
  openWompiWidgetCheckout as openWidget,
  tokenizeWompiCard as tokenizeCard,
  type WompiCardTokenInput,
  type WompiCardTokenResult,
  type WidgetCheckoutConfig,
  type WidgetCheckoutResult,
} from "../infrastructure/wompi-browser";

const paymentPort = new HttpPaymentAdapter();
const shippingPort = new HttpShippingAdapter();
const transactionPort = new HttpTransactionAdapter();

export function getPaymentConfig(
  signal?: AbortSignal,
): Promise<ScreenResult<PaymentConfigDto>> {
  return paymentPort.getPaymentConfig(signal);
}

export function getCheckoutSettings(
  signal?: AbortSignal,
): Promise<ScreenResult<CheckoutSettingsDto>> {
  return shippingPort.getCheckoutSettings(signal);
}

export function listShippingQuotes(
  city: ShippingCityCode,
  signal?: AbortSignal,
): Promise<ScreenResult<ShippingMethodQuoteDto[]>> {
  return shippingPort.listShippingQuotes(city, signal);
}

export function createTransaction(
  request: CreateTransactionRequest,
  signal?: AbortSignal,
): Promise<ScreenResult<TransactionDto>> {
  return transactionPort.createTransaction(request, signal);
}

export function payTransaction(
  transactionId: string,
  request: PayTransactionRequest,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<ScreenResult<TransactionDto>> {
  return transactionPort.payTransaction(
    transactionId,
    request,
    idempotencyKey,
    signal,
  );
}

export function getWidgetSession(
  transactionId: string,
  signal?: AbortSignal,
): Promise<ScreenResult<WidgetCheckoutSessionDto>> {
  return transactionPort.getWidgetSession(transactionId, signal);
}

export function syncProviderPayment(
  transactionId: string,
  request: SyncProviderPaymentRequest,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<ScreenResult<TransactionDto>> {
  return transactionPort.syncProviderPayment(
    transactionId,
    request,
    idempotencyKey,
    signal,
  );
}

export function getTransaction(
  transactionId: string,
  signal?: AbortSignal,
): Promise<ScreenResult<TransactionDto>> {
  return transactionPort.getTransaction(transactionId, signal);
}

/** Thin composition wrappers so presentation never imports wompi-browser. */
export function newIdempotencyKey(): string {
  return createIdempotencyKey();
}

export function tokenizeWompiCard(
  publicKey: string,
  input: WompiCardTokenInput,
): Promise<WompiCardTokenResult> {
  return tokenizeCard(publicKey, input);
}

export function openWompiWidgetCheckout(
  config: WidgetCheckoutConfig,
  onComplete?: (result: WidgetCheckoutResult) => void,
): Promise<void> {
  return openWidget(config, onComplete);
}
