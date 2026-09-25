# Checkout

[![CI](https://github.com/MrLuis-WebMaster/desk-checkout/actions/workflows/ci.yml/badge.svg)](https://github.com/MrLuis-WebMaster/desk-checkout/actions/workflows/ci.yml)

Catalog and checkout for desk gear priced in COP. Shoppers browse stock, pay with Wompi (card or widget), and the API/worker settle the order once.

| Piece | Stack |
| --- | --- |
| `apps/web` | Vue 3 + Pinia + Vite |
| `apps/api` | NestJS modular monolith |
| `apps/worker` | NestJS — Wompi webhooks + reconciliation |
| `packages/*` | Shared contracts and settlement |

Product voice and UI tokens live in [`PRODUCT.md`](PRODUCT.md) and [`DESIGN.md`](DESIGN.md).

## Documentation

| Guide | Topic |
| --- | --- |
| [`docs/architecture.md`](docs/architecture.md) | Pay → sync → webhook → stuck/orphan; settlement; statuses |
| [`docs/operations.md`](docs/operations.md) | Coolify, env, health, compose.prod smoke |
| [`docs/testing.md`](docs/testing.md) | `pnpm test` / coverage gate; manual smokes |
| [`docs/security.md`](docs/security.md) | Hardening, throttler, webhooks, residual risks |
| [`docs/adr/`](docs/adr/README.md) | Architecture decision records |

## Local setup

Requires **Node.js 22+**.

```bash
pnpm install
cp .env.example .env
cp apps/web/.env.example apps/web/.env
cp apps/worker/.env.example apps/worker/.env
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

| App | URL |
| --- | --- |
| Web | http://localhost:5173 |
| API health | http://localhost:3000/health |
| API docs | http://localhost:3000/docs |
| Worker health | http://localhost:3001/health |

PostgreSQL: `localhost:5433` (user/password/db `checkout`). Port **5433** avoids clashing with a local Postgres on 5432.

After schema changes, run `pnpm db:migrate` and `pnpm db:seed` again.

## Environment

Copy values from `.env.example` / `apps/worker/.env.example`. Sandbox keys come from the [Wompi dashboard](https://comercios.wompi.co/). Production-oriented template: [`deploy/env.production.example`](deploy/env.production.example). See [`docs/operations.md`](docs/operations.md) for Coolify knobs (`CORS_ORIGIN`, `TRUST_PROXY`, Events URL).

| Variable | Who | Notes |
| --- | --- | --- |
| `WOMPI_PUBLIC_KEY` / `WOMPI_PRIVATE_KEY` / `WOMPI_INTEGRITY_SECRET` | API | Card charge + widget signature |
| `WOMPI_EVENTS_SECRET` | Worker | Event checksum (not the integrity secret) |
| `CORS_ORIGIN` | API | Comma-separated browser origins |
| `TRUST_PROXY` | API | Off by default. Set only behind a real reverse proxy |
| `WEBHOOK_MAX_SKEW_SECONDS` | Worker | Default `300` |
| `STUCK_PENDING_AFTER_MS` / `ORPHAN_PENDING_TTL_MS` / `JOB_INTERVAL_MS` | Worker | Reconciliation timing |

## How it fits together

1. Web creates a guest transaction (`PENDING`), then charges via card token or the Wompi widget.
2. Stock decrements only when Wompi reports **APPROVED** — pay, sync, webhook, and stuck recovery all go through the same settlement writer (`packages/settlement`).
3. Money fields are integer COP. Creating a transaction snapshots prices and fees; it only checks stock. Payment locks and decrements.
4. Idempotency keys on pay/sync (and webhook keys `webhook:{providerId}:{status}`) replay safely; no double charge or double decrement.
5. If Wompi approves but stock cannot be decremented, the order stays `ERROR`, the system attempts a void, and the UI tells the shopper not to retry.
6. Uncharged `PENDING` orders expire to `EXPIRED` after `ORPHAN_PENDING_TTL_MS`.
7. Guest `GET /transactions/:id` is UUID-only (no auth). Treat UUIDs as secrets.

Wompi **Events URL** must point at the worker: `https://<public-host>/webhooks/wompi`.

Full flow and status table: [`docs/architecture.md`](docs/architecture.md).

### Webhook tunnel (local)

```bash
# with pnpm dev running
cloudflared tunnel --url http://localhost:3001
# or: ngrok http 3001
```

Set that HTTPS origin + `/webhooks/wompi` in the Wompi dashboard. Pay and abandon before sync — the webhook should settle. Replay and bad checksums must not mutate stock twice or at all. More checklist items: [`docs/testing.md`](docs/testing.md).

## Scripts

```bash
pnpm dev          # api + worker + web
pnpm test         # unit tests
pnpm test:cov     # 80% line/statement gate per package
pnpm lint
pnpm build
pnpm audit:ci
```

## CI

On `pull_request` and `push` to `main` (`.github/workflows/ci.yml`):

| Job | Role |
| --- | --- |
| `quality` | lint, build, `test:cov` |
| `docker` | Build api / worker / web images + `nginx -t` |
| `audit` | Advisory `pnpm audit --audit-level=high` |

Require `quality` and `docker` via branch protection if merges should block on red checks. Enable GitHub secret scanning + push protection in repo settings.

## Security

See [`docs/security.md`](docs/security.md) — Helmet/CORS/ValidationPipe, trust proxy, one API replica, webhook checksum path, log redaction, nginx CSP, guest UUID residual risk.

## Deploy

Prod-like smoke (Postgres **5434**, api **3000**, worker **3001**, web **8080**). Coolify checklist, migrate-on-start, and env details: [`docs/operations.md`](docs/operations.md).

```bash
docker compose -f docker-compose.prod.yml up --build -d
curl -sf http://localhost:3000/health
curl -sf http://localhost:3001/health
curl -sf http://localhost:8080/
```
