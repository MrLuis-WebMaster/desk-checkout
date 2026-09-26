# ADR 0009: Transactional outbox

## Status

Accepted

## Context

After a purchase is approved we need a domain event (`order.confirmed`) for downstream work (notifications today as a skeleton). Publishing to RabbitMQ after `COMMIT` opens a window: the database commit succeeds, the process dies, and the message never leaves. Emitting the event only from the Rabbit payment consumer would skip purchases settled via pay/sync.

## Decision

- Insert `outbox_events` in the same Postgres transaction as transaction status, inventory, and delivery updates inside `TypeOrmTransactionWriter.updateAfterPayment`.
- A worker `OutboxPublisher` polls unpublished rows with a lease (`locked_until` / `available_at`), publishes with confirms, then sets `published_at` only if it still owns the lease.
- Do not hold `FOR UPDATE` open while talking to RabbitMQ.
- Notification consumers remain at-least-once; this challenge does not persist notification idempotency for the noop adapter.

## Consequences

- Pay, sync, webhook, and stuck recovery all emit the same outbox row when a purchase genuinely closes as approved with stock.
- Duplicate publishes are possible if a publisher dies after Rabbit accepts the message but before `published_at` is set; consumers must tolerate at-least-once delivery.
- Horizontal worker replicas can claim outbox rows safely via the lease.
