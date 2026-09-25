export { Money } from "./domain/money.js";
export {
  ok,
  err,
  type Ok,
  type Err,
  type Result,
} from "./domain/result.js";
export {
  ProductNotFoundError,
  OutOfStockError,
  TransactionNotFoundError,
  InvalidTransactionStateError,
  PaymentFailedError,
  IdempotencyConflictError,
} from "./domain/transaction/errors.js";
export { toProviderAmountInCents } from "./domain/transaction/provider-amount.js";
export { providerPaymentMatchesTransaction } from "./domain/transaction/provider-binding.js";
export {
  Transaction,
  type TransactionCustomer,
  type TransactionDelivery,
  type TransactionLine,
} from "./domain/transaction/transaction.js";
export {
  SettlementPaymentGateway,
  type ProviderPayment,
} from "./application/ports/payment-gateway.port.js";
export {
  TransactionWriter,
  type PaymentSettlement,
  type ExpireUnchargedOptions,
} from "./application/ports/transaction-writer.port.js";
export { TransactionReader } from "./application/ports/transaction-reader.port.js";
export {
  IdempotencyStore,
  type IdempotencyRecord,
} from "./application/ports/idempotency-store.port.js";
export {
  SettlementLogger,
  NoopSettlementLogger,
  type SettlementLogMeta,
} from "./application/ports/settlement-logger.port.js";
export {
  SettleProviderPaymentService,
  type SettleError,
  type SettleSource,
  type SettlePollConfig,
} from "./application/services/settle-provider-payment.js";
