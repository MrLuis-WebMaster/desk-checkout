# ADR 0008: RabbitMQ asynchronous messaging

## Status

Accepted

## Context

Wompi webhooks previously hit the worker and ran settlement inside the HTTP request. That couples provider retries to settlement latency and makes bursts of Events traffic compete with reconciliation timers on the same process. Redis/BullMQ would add another datastore and job semantics we do not need for a single payment queue.

## Decision

- Move the public Events URL to the API (`POST /webhooks/wompi`). The API validates checksum and publishes a versioned `payment.status.changed` message to RabbitMQ with publisher confirms, then returns 200. Publish failures return 503 so Wompi retries.
- The existing Nest worker consumes `payment.events`, ACKs on success, and reuses `HandleWompiEventUseCase` → `SettleProviderPaymentService`.
- Use `amqplib` in Nest-free `@checkout/messaging`. Queues: `payment.events`, `payment.events.retry` (TTL 5s + DLX back to main), `payment.events.dlq`. Bounded retries via `x-retry-count`; never `requeue=true`.
- RabbitMQ is **not** on the critical checkout path. API bootstrap must not block on the broker; catalog/create/pay/sync keep working when Rabbit is down. `/health` does not probe Rabbit.
- Do **not** move inventory updates onto RabbitMQ. Stock stays inside the Postgres settlement transaction.

## Consequences

- Wompi Events URL targets the API public host, not the worker.
- Reconciliation remains the recovery path for lost webhooks.
- ADR 0001 still applies for the long-lived worker process; only the Events ingress moves.
