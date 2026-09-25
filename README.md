# Checkout

[![CI](https://github.com/MrLuis-WebMaster/desk-checkout/actions/workflows/ci.yml/badge.svg)](https://github.com/MrLuis-WebMaster/desk-checkout/actions/workflows/ci.yml)

Catalog and checkout for desk gear priced in COP. Shoppers browse stock, pay with Wompi (card or widget), and the API/worker settle the order once.

| Piece | Stack |
| --- | --- |
| `apps/web` | Vue 3 + Pinia + Vite |
| `apps/api` | NestJS modular monolith (checkout + Wompi webhook ingress) |
| `apps/worker` | NestJS — payment consumer, reconciliation, outbox, notifications skeleton |
| `packages/*` | Shared contracts, settlement, messaging |
| Infra (local/prod) | PostgreSQL, RabbitMQ 4, Docker, Wompi sandbox |

Product voice and UI tokens live in [`PRODUCT.md`](PRODUCT.md) and [`DESIGN.md`](DESIGN.md).

## Data model

| Entity | Role |
| --- | --- |
| **Product** | Catalog item: name, description, price (integer COP), image URL. |
| **Inventory** | One row per product with `available` units. Stock decrements only on **APPROVED**. |
| **Customer** | Guest buyer: full name, email, phone. Created with the order (or via `POST /customers`). |
| **Delivery** | Address line, city code, shipping method, and lifecycle status (`PENDING` → `READY` on approve). |
| **Transaction** | Order snapshot: line items, base fee, delivery fee, total, status, optional Wompi provider id. |
| **Outbox** | `outbox_events` for post-purchase `order.confirmed` messages. |
| **Shipping** | Active methods plus per-city rates (`shipping_methods` / `shipping_rates`). |
| **Base fee** | Checkout setting (`checkout_settings`) added to every order total alongside delivery. |

Money fields are integer COP throughout.

## Documentation

| Guide | Topic |
| --- | --- |
| [`docs/architecture.md`](docs/architecture.md) | Sync checkout, async webhook, settlement, RabbitMQ, outbox |
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
| API docs (Swagger) | http://localhost:3000/docs |
| Worker health | http://localhost:3001/health |
| RabbitMQ management | http://localhost:15672 (guest/guest) |

PostgreSQL: `localhost:5433` (user/password/db `checkout`). RabbitMQ AMQP: `localhost:5672`. Port **5433** avoids clashing with a local Postgres on 5432.

After schema changes, run `pnpm db:migrate` and `pnpm db:seed` again.

### API docs (Swagger)

OpenAPI UI is served at **`/docs`** when `ENABLE_SWAGGER` is unset/`1`/`true` (default, including production). Set `ENABLE_SWAGGER=0` to disable docs and Swagger CSP. Locally: [http://localhost:3000/docs](http://localhost:3000/docs). After deploy: `https://<api-host>/docs` (replace with the public API host). No Postman collection is maintained.

## Environment

Copy values from `.env.example` / `apps/worker/.env.example`. Sandbox keys come from the [Wompi dashboard](https://comercios.wompi.co/). Production-oriented template: [`deploy/env.production.example`](deploy/env.production.example). See [`docs/operations.md`](docs/operations.md) for Coolify knobs (`CORS_ORIGIN`, `TRUST_PROXY`, Events URL).

| Variable | Who | Notes |
| --- | --- | --- |
| `RABBITMQ_URL` | API + worker | Local default `amqp://guest:guest@localhost:5672` |
| `WOMPI_PUBLIC_KEY` / `WOMPI_PRIVATE_KEY` / `WOMPI_INTEGRITY_SECRET` | API (+ worker) | Card charge + widget signature |
| `WOMPI_EVENTS_SECRET` | API | Event checksum (not the integrity secret) |
| `CORS_ORIGIN` | API | Comma-separated browser origins |
| `TRUST_PROXY` | API | Off by default. Set only behind a real reverse proxy |
| `WEBHOOK_MAX_SKEW_SECONDS` | API | Default `300` (docs compatibility; skew does not reject) |
| `STUCK_PENDING_AFTER_MS` / `ORPHAN_PENDING_TTL_MS` / `JOB_INTERVAL_MS` | Worker | Reconciliation timing |
| `OUTBOX_POLL_MS` | Worker | Outbox publisher interval |

## How it fits together

1. Web creates a guest transaction (`PENDING`, delivery `PENDING`), then charges via card token or the Wompi widget.
2. Stock decrements only when Wompi reports **APPROVED** — pay, sync, webhook-driven consumption, and stuck recovery all go through the same settlement writer (`packages/settlement`). Delivery becomes `READY` and an `order.confirmed` outbox row is written in the same Postgres transaction.
3. Money fields are integer COP. Creating a transaction snapshots prices and fees; it only checks stock. Payment locks and decrements.
4. Idempotency keys on pay/sync (and webhook keys `webhook:{providerId}:{status}`) replay safely; no double charge or double decrement.
5. If Wompi approves but stock cannot be decremented, the order stays `ERROR`, delivery `CANCELLED`, the system attempts a void, and the UI tells the shopper not to retry.
6. Uncharged `PENDING` orders expire to `EXPIRED` after `ORPHAN_PENDING_TTL_MS`.
7. Guest `GET /transactions/:id` is UUID-only (no auth). Treat UUIDs as secrets.
8. Wompi Events hit the API → RabbitMQ → worker. Checkout/pay/sync do not require RabbitMQ to be up.

Wompi **Events URL** must point at the API: `https://<public-api-host>/webhooks/wompi`.

Full flow and status table: [`docs/architecture.md`](docs/architecture.md).

### Webhook tunnel (local)

```bash
# with pnpm dev running
cloudflared tunnel --url http://localhost:3000
# or: ngrok http 3000
```

Set that HTTPS origin + `/webhooks/wompi` in the Wompi dashboard. Pay and abandon before sync — the webhook should publish and the worker should settle. Replay and bad checksums must not mutate stock twice or at all. More checklist items: [`docs/testing.md`](docs/testing.md).

## Scripts

```bash
pnpm dev          # api + worker + web
pnpm test         # unit tests
pnpm test:cov     # 80% line/statement gate per package
pnpm lint
pnpm build
pnpm audit:ci
```

### Coverage (`pnpm test:cov`)

Gate: **80%** lines and statements per package (branches not gated). Numbers from the latest local run:

| Package | Statements | Lines | Branches | Functions |
| --- | ---: | ---: | ---: | ---: |
| `@checkout/api` | 88.83% | 89.08% | 80.4% | 87.12% |
| `@checkout/web` | 88.07% | 88.07% | 84.27% | 92.2% |
| `@checkout/worker` | 88.99% | 89.52% | 76.47% | 93.93% |
| `@checkout/contracts` | 100% | 100% | 100% | 100% |
| `@checkout/settlement` | 97.72% | 97.7% | 92.3% | 100% |
| `@checkout/settlement-typeorm` | 97.65% | 97.61% | 81.39% | 100% |

API/worker/packages use **Jest**; the web app uses **Vitest**. Details: [`docs/testing.md`](docs/testing.md).

## CI

On `pull_request` and `push` to `main` (`.github/workflows/ci.yml`):

| Job | Role |
| --- | --- |
| `quality` | lint, build, `test:cov` |
| `messaging-integration` | RabbitMQ service + `@checkout/messaging` integration tests |
| `docker` | Build api / worker / web images + `nginx -t` |
| `audit` | Advisory `pnpm audit --audit-level=high` |

Require `quality` and `docker` via branch protection if merges should block on red checks. Enable GitHub secret scanning + push protection in repo settings.

## Security

See [`docs/security.md`](docs/security.md) — Helmet/CORS/ValidationPipe, trust proxy, one API replica, webhook checksum path, log redaction, nginx CSP, guest UUID residual risk.

## Deploy

Prod-like smoke (Postgres **5434**, api **3000**, worker **3001**, web **8080**). Coolify checklist, migrate-on-start, and env details: [`docs/operations.md`](docs/operations.md).

| Surface | URL |
| --- | --- |
| Deployed web | `https://<web-host>` (set after Coolify / public DNS) |
| Deployed API docs | `https://<api-host>/docs` |

```bash
docker compose -f docker-compose.prod.yml up --build -d
curl -sf http://localhost:3000/health
curl -sf http://localhost:3001/health
curl -sf http://localhost:8080/
```
