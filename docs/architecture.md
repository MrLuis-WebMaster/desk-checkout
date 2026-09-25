# Architecture

Catalog and checkout for desk gear priced in COP. Shoppers browse stock, pay with Wompi (card or widget), and the API/worker settle each order once through a shared settlement writer. RabbitMQ carries asynchronous payment events and post-purchase `order.confirmed` messages. Redis/BullMQ are not used.

## Apps

| App | Role |
| --- | --- |
| `apps/web` | Vue 3 SPA — catalog, guest checkout, Wompi card/widget UI |
| `apps/api` | NestJS modular monolith — catalog, create/pay/sync, guest status reads, Wompi webhook ingress (`POST /webhooks/wompi`) |
| `apps/worker` | NestJS — payment event consumer, reconciliation, outbox publisher, notification skeleton |

Shared types live in `packages/contracts`. Settlement domain/application lives in `packages/settlement`; TypeORM persistence adapters live in `packages/settlement-typeorm`. Messaging helpers live in `packages/messaging`.

## Synchronous checkout path

```text
Web ──create──► API (PENDING, price/fee snapshot, stock check only, Delivery PENDING)
  │
  ├──pay (card) or widget ──► API ──► Wompi
  │                              │
  │                              └── SettleProviderPaymentService
  ├──sync (poll) ──────────────────┤
  │                                ▼
  │                      TransactionWriter.updateAfterPayment
  │                      (status + stock + delivery + outbox)
```

RabbitMQ is **not** required for create/pay/sync. If the broker is down, checkout still works; only webhook publishing returns 503.

## Asynchronous webhook path

```text
Wompi ──► API POST /webhooks/wompi
            checksum validate
            publish payment.status.changed (publisher confirm)
            200

RabbitMQ payment.events
            │
Worker PaymentEventConsumer
            │
HandleWompiEventUseCase → SettleProviderPaymentService → same writer
```

Stuck PENDING recovery and orphan expiry still run on the worker and call the same settlement surface.

## Settlement and delivery

All settlement paths call `SettleProviderPaymentService` → `TransactionWriter.updateAfterPayment`. On `APPROVED` with successful stock decrement, the same Postgres transaction sets Delivery `READY` and inserts an `order.confirmed` outbox row. `DECLINED` / `ERROR` / `EXPIRED` set Delivery `CANCELLED` (no outbox). `SHIPPED` / `DELIVERED` exist in the enum without transitions yet.

## Outbox and notifications

```text
outbox_events (unpublished)
  → OutboxPublisher (lease claim)
  → RabbitMQ order.confirmed
  → OrderConfirmedConsumer
  → NotificationPort (NoopNotificationAdapter)
```

The notification port is an extension point. A real provider must bring its own idempotency strategy; this skeleton does not persist notification dedupe.

## Transaction statuses

| Status | Meaning |
| --- | --- |
| `PENDING` | Created; payment not settled |
| `APPROVED` | Provider approved; stock decremented via settlement |
| `DECLINED` | Provider declined |
| `ERROR` | Settlement failure (e.g. approved but out of stock after void attempt) |
| `EXPIRED` | Orphan `PENDING` past TTL (no successful charge path) |

## Money and stock

- **Money** — Integer COP (no floats). Create snapshots prices and fees; it only checks stock.
- **Stock** — Decrements only on `APPROVED`, inside the settlement writer — never via a RabbitMQ consumer.

Guest `GET /transactions/:id` is UUID-only with no auth; treat transaction UUIDs as secrets ([ADR 0003](adr/0003-guest-uuid-access.md)). See also [ADR 0002](adr/0002-single-settlement-writer.md), [ADR 0008](adr/0008-rabbitmq-asynchronous-messaging.md), [ADR 0009](adr/0009-transactional-outbox.md).
