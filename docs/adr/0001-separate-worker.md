# ADR 0001: Separate worker

## Status

Accepted (amended)

## Context

Wompi Events must hit a stable public URL. Reconciliation (stuck PENDING sync, orphan expiry) needs a long-lived process with timers. Putting settlement work on every HTTP webhook request couples checkout latency to webhook bursts and makes horizontal scaling of the HTTP API riskier (migrate-on-start, in-memory throttler).

## Decision

Run asynchronous payment consumption, outbox draining, notifications skeleton, and reconciliation in `apps/worker` (NestJS). The Wompi Events URL targets `POST /webhooks/wompi` on the **API**, which validates and publishes to RabbitMQ. The worker owns consumers and timers; both apps share `packages/settlement` for settlement.

## Consequences

- Two deployables and health probes; worker must start after API migrations are healthy in prod compose/Coolify.
- Webhook trust is checksum + idempotency (not API IP throttling on the Events route).
- Settlement logic stays shared so pay, sync, webhook-driven consumption, and stuck recovery cannot diverge.
