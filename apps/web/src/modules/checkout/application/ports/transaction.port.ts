import type {
  CreateTransactionRequest,
  PayTransactionRequest,
  SyncProviderPaymentRequest,
  TransactionDto,
  WidgetCheckoutSessionDto,
} from "@checkout/contracts";
import type { ScreenResult } from "@/shared/application/results/screen-result";

export abstract class TransactionPort {
  abstract createTransaction(
    request: CreateTransactionRequest,
    signal?: AbortSignal,
  ): Promise<ScreenResult<TransactionDto>>;

  abstract payTransaction(
    transactionId: string,
    request: PayTransactionRequest,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<ScreenResult<TransactionDto>>;

  abstract getWidgetSession(
    transactionId: string,
    signal?: AbortSignal,
  ): Promise<ScreenResult<WidgetCheckoutSessionDto>>;

  abstract syncProviderPayment(
    transactionId: string,
    request: SyncProviderPaymentRequest,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<ScreenResult<TransactionDto>>;

  abstract getTransaction(
    transactionId: string,
    signal?: AbortSignal,
  ): Promise<ScreenResult<TransactionDto>>;
}
