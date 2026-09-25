# ADR 0002: Single settlement writer

## Status

Accepted

## Context

Pay, sync, webhook, and stuck recovery can all observe the same Wompi approval. Multiple decrement paths would double-sell stock or leave inconsistent statuses.

## Decision

All settlement goes through `SettleProviderPaymentService` → `TransactionWriter.updateAfterPayment` in `packages/settlement`. Persistence adapters live in `packages/settlement-typeorm`. Package guards (`single-writer-surface.spec.ts`) keep `updateAfterPayment` off other surfaces.

When Wompi reports approved but stock cannot be decremented, settlement persists `ERROR`, attempts a void, and completes the idempotency key with `OUT_OF_STOCK`.

## Consequences

- API and worker stay free of alternate stock writers.
- Idempotent replays are safe across channels.
- Out-of-stock after approval is an explicit `ERROR` + void path, not a silent approve.
