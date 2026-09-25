# Security

Summary of HTTP hardening, throttling, webhook trust, logging, and residual guest-access risk. Operational knobs (`TRUST_PROXY`, `CORS_ORIGIN`) are detailed in [operations](operations.md).

## API HTTP surface

- **Helmet** — Applied in `applyApiHttpHardening` (Swagger-oriented CSP only when docs are enabled outside production).
- **CORS** — Allowlist from `CORS_ORIGIN` (comma-separated origins; no `*`).
- **ValidationPipe** — `whitelist`, `forbidNonWhitelisted`, `transform`.
- **Body limit** — ~**256kb** JSON (custom parsers; Nest body parser disabled at bootstrap).
- **Throttler** — Nest in-memory throttler; health endpoints skip throttle. Default + stricter limits on sensitive transaction routes.

## Trust proxy and replicas

`TRUST_PROXY` is **off by default**. Enabling it without a real reverse proxy that sets `X-Forwarded-For` lets clients spoof client IPs and weaken throttling. `docker-compose.prod.yml` forces it off for direct host publish.

The throttler is **in-memory (per process)**. Keep **one API replica** unless you add a shared store (e.g. Redis). One replica also avoids concurrent TypeORM `migration:run` on start ([ADR 0004](adr/0004-trust-proxy-and-single-replica.md), [ADR 0005](adr/0005-dist-only-migrate-on-start.md)).

## Worker webhooks

Worker webhook routes are **not IP-throttled**. Protection is:

1. Event **checksum** (`WOMPI_EVENTS_SECRET`)
2. Timestamp **skew** (`WEBHOOK_MAX_SKEW_SECONDS`)
3. **Idempotency** keys for settlement (`webhook:{providerId}:{status}`)

## Logging

API (and worker filters) redact known secrets from log strings: `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET` values, `prv_*` key shapes, and `Authorization` / Bearer credentials.

## Web nginx

`apps/web/nginx.conf` sets **Content-Security-Policy** (allows Wompi checkout scripts/frames) and **frame denial** (`frame-ancestors 'none'`) for the SPA.

## Residual risk: guest UUID access

`GET /transactions/:id` is unauthenticated and keyed only by transaction UUID. Anyone who obtains a UUID can read that order’s status payload. Treat UUIDs as secrets (do not log them in public analytics, do not put them in shareable URLs beyond the checkout flow). See [ADR 0003](adr/0003-guest-uuid-access.md).
