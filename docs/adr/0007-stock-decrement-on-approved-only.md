# ADR 0007: Stock decrement on APPROVED only

## Status

Accepted

## Context

Holding stock at create would strand inventory on abandoned checkouts. Decrementing on pay start would sell units for declined payments.

## Decision

- **Create** checks stock availability only.
- **Decrement** runs only when settlement records `APPROVED`, inside `SettleProviderPaymentService` / `TransactionWriter.updateAfterPayment`.
- Declined, expired, and error paths do not decrement. Approved-but-cannot-decrement becomes `ERROR` with a void attempt.

## Consequences

- Over-selling under concurrency is mitigated by the settlement writer’s lock/decrement, not by create-time holds.
- Orphan TTL can expire uncharged `PENDING` without restoring stock (none was taken).
- UI must handle `ERROR` / out-of-stock after provider approval without encouraging a blind retry.
