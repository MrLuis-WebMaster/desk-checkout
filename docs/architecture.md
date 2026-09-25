# Architecture

Catalog and checkout for desk gear priced in COP. Shoppers browse stock, pay with Wompi (card or widget), and the API/worker settle each order once through a shared settlement writer.

## Apps

| App | Role |
| --- | --- |
| `apps/web` | Vue 3 SPA — catalog, guest checkout, Wompi card/widget UI |
| `apps/api` | NestJS modular monolith — catalog, create/pay/sync transactions, guest status reads |
| `apps/worker` | NestJS — Wompi webhooks (`POST /webhooks/wompi`) and reconciliation jobs (stuck + orphan) |

Shared types live in `packages/contracts`. Settlement domain/application lives in `packages/settlement`; TypeORM persistence adapters live in `packages/settlement-typeorm`. Both `apps/api` and `apps/worker` compose those packages behind ports.

## Payment and settlement flow

```text
Web ──create──► API (PENDING, price/fee snapshot, stock check only)
  │
  ├──pay (card) or widget ──► API ──► Wompi
  │                              │
  │                              └── SettleProviderPaymentService
  │                                        │
  ├──sync (poll) ──────────────────────────┤
  │                                        ▼
  │                              TransactionWriter.updateAfterPayment
  │                                        │
Worker ◄── Wompi Events URL                │  stock− only if APPROVED
  │   POST /webhooks/wompi                 │
  │   checksum + skew + idempotency        │
  │                                        │
  └── stuck PENDING recovery ──────────────┘
  └── orphan PENDING → EXPIRED (no provider charge)
```

1. **Create** — Guest transaction starts as `PENDING`. Money fields are integer COP; create snapshots product prices and fees and **checks** stock. It does not decrement.
2. **Pay / sync** — Card charge or widget completion, then optional sync, go through the same settlement path as webhooks and stuck recovery.
3. **Webhook** — Wompi Events URL must target the worker (`…/webhooks/wompi`), not the API. Checksum, timestamp skew, and idempotency keys (`webhook:{providerId}:{status}`) protect settlement.
4. **Stuck PENDING** — Worker polls provider status for charged-but-unsettled rows and settles via the same writer.
5. **Orphan PENDING** — Uncharged `PENDING` rows older than `ORPHAN_PENDING_TTL_MS` become `EXPIRED`.

Idempotency on pay/sync (and webhook keys) replays safely: no double charge and no double stock decrement.

## Single settlement writer

All settlement paths call `SettleProviderPaymentService` → `TransactionWriter.updateAfterPayment` in `packages/settlement`. There is no second stock-decrement path in the API or worker.

If Wompi reports approved but stock cannot be decremented, settlement persists `ERROR`, attempts a void, and completes the idempotency key with `OUT_OF_STOCK`. The UI tells the shopper not to retry.

See also [ADR 0002](adr/0002-single-settlement-writer.md) and `packages/settlement/README.md`.

## Transaction statuses

From `packages/contracts` (`TransactionStatus`):

| Status | Meaning |
| --- | --- |
| `PENDING` | Created; payment not settled |
| `APPROVED` | Provider approved; stock decremented via settlement |
| `DECLINED` | Provider declined |
| `ERROR` | Settlement failure (e.g. approved but out of stock after void attempt) |
| `EXPIRED` | Orphan `PENDING` past TTL (no successful charge path) |

## Money and stock

- **Money** — All amounts are integer COP (no floats). Create snapshots prices and fees onto the transaction.
- **Stock** — Create only checks availability. Decrement happens only on `APPROVED`, inside the settlement writer.

Guest `GET /transactions/:id` is UUID-only with no auth; treat transaction UUIDs as secrets ([ADR 0003](adr/0003-guest-uuid-access.md)).
