# ADR 0001: Separate worker

## Status

Accepted

## Context

Wompi Events must hit a stable public URL. Reconciliation (stuck PENDING sync, orphan expiry) needs a long-lived process with timers. Putting both on the API couples checkout latency to webhook bursts and makes horizontal scaling of the HTTP API riskier (migrate-on-start, in-memory throttler).

## Decision

Run webhooks and reconciliation in `apps/worker` (NestJS), not in `apps/api`. The Wompi Events URL targets `POST /webhooks/wompi` on the worker. The API owns create/pay/sync and guest reads; both apps share `packages/settlement` for settlement.

## Consequences

- Two deployables and health probes; worker must start after API migrations are healthy in prod compose/Coolify.
- Webhook trust is checksum + skew + idempotency, not API IP throttling.
- Settlement logic stays shared so pay, sync, webhook, and stuck recovery cannot diverge.
