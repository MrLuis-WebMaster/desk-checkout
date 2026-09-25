# ADR 0004: Trust proxy and single API replica

## Status

Accepted

## Context

Nest’s throttler uses client IP. Behind a reverse proxy, Express must trust `X-Forwarded-For`. If trust is enabled without a proxy, clients can spoof IPs and bypass limits. The throttler store is in-memory per process.

## Decision

- Keep `TRUST_PROXY` **off by default**. Set it only when Coolify/nginx terminates TLS and forwards real client IPs.
- Force `TRUST_PROXY=false` in `docker-compose.prod.yml` (API port published directly).
- Keep **one API replica** until a shared throttler store (e.g. Redis) exists.

## Consequences

- Correct throttling behind a configured proxy; safe direct publish for local prod smoke.
- Horizontal API scale is blocked until Redis (or equivalent) and a multi-replica migrate strategy exist.
