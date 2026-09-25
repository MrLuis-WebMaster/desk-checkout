export {
  RabbitConnectionManager,
  RabbitUnavailableError,
  type RabbitConnectionManagerOptions,
} from "./connection-manager.js";
export {
  handleConsumerFailure,
  DeadLetterError,
  type AckFn,
  type ConsumedMessage,
  type MessageHandler,
  type PublishFn,
} from "./retry.js";
export {
  assertQueueTriplet,
  decideRetry,
  MAX_RETRY_ATTEMPTS,
  ORDER_CONFIRMED_QUEUES,
  PAYMENT_EVENTS_QUEUES,
  readRetryCount,
  RETRY_HEADER,
  RETRY_TTL_MS,
  type QueueTriplet,
} from "./topology.js";
