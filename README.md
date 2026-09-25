# Checkout

[![CI](https://github.com/MrLuis-WebMaster/ecommerce-wompi/actions/workflows/ci.yml/badge.svg)](https://github.com/MrLuis-WebMaster/ecommerce-wompi/actions/workflows/ci.yml)

TypeScript monorepo for a product checkout: Vue 3 + Pinia on the frontend, NestJS modular monolith on the backend.

## Phases

1. ~~Monorepo scaffold, shared contracts, health endpoints, Pinia shell.~~ **Done**
2. ~~Catalog, inventory, and database seed.~~ **Done**
3. ~~Customers, delivery, and transactions.~~ **Done**
4. ~~Checkout orchestration and payment provider.~~ **Done**
5. ~~Frontend checkout flow.~~ **Done**
6. ~~Async worker + Wompi webhooks.~~ **Done**
7. ~~Tests above 80% coverage.~~ **Done**
8. ~~Security, CI, and deployment (artifacts + CI).~~ **Done** — Coolify dashboard wiring remains ops (see Deploy).

### Coverage

Per-package line/statement gate at **80%** (`pnpm test:cov`). Branches are reported only (soft).

| Package | Tool | In scope (high level) |
| --- | --- | --- |
| `@checkout/contracts` | Jest | `src/**` except barrel `index.ts` |
| `@checkout/settlement` | Jest | `domain` + `application` |
| `@checkout/settlement-typeorm` | Jest | `src/**` except orm entities / barrel |
| `@checkout/api` | Jest | Plan globs (application/domain/controllers/mappers/infra/shared/config). Extra excludes: Nest modules, DTOs, orm entities, migrations, `typeorm.data-source.ts`, `seed.ts`, `setup-swagger.ts`, Nest settlement logger, `typeorm-product-reader.ts` (large list/cursor TypeORM reader) |
| `@checkout/worker` | Jest | Plan globs (application + presentation + settlement infra + config + shared filters). Extra excludes: Nest modules, `main.ts`, `reconciliation.scheduler.ts` (timer-bound; use cases covered) |
| `@checkout/web` | Vitest | Plan include `src/**/*.{ts,tsx}`. Plan excludes: Vue SFCs, `main.ts`, `vite-env.d.ts`, tests, composition barrels, catalog `http-*.ts` adapters, `wompi-browser.ts`. Extra excludes: `api-client.ts`, `app/router.ts`, `shared/ui/index.ts`, application port types, catalog 1-line re-exports, checkout page shell (`use-checkout-page` — form+quote+create orchestration; charge/sync covered via `http-checkout.adapter`, `use-card-payment`, `use-wompi-widget`, `use-checkout-result`), catalog list/detail composables (`use-product-list-query`, `use-product-list`, `use-product`) |

```bash
pnpm test
pnpm test:cov
```

## Local setup

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
| API | http://localhost:3000/health |
| Worker | http://localhost:3001/health |

PostgreSQL listens on `localhost:5433` (container port 5432). Database, user, and password are `checkout`. Port 5433 avoids clashing with a local PostgreSQL on 5432.

Requires **Node.js 22+** (`engines.node`).

### Catalog API

- `GET /products` — cursor-paginated list (`pageSize`, `q`, `sort`, `order`, `after`, `before`)
- `GET /products/:id` — product detail with `availableStock`

### Checkout data API

- `GET /shipping-methods?city=BOG` — active shipping methods with their city fee
- `GET /checkout/settings` — current base fee
- `POST /transactions` — creates a guest transaction in `PENDING` status from multi-item `items[]` (`productId` + `quantity` per line)
- `GET /transactions/:id` — returns the transaction with pricing snapshots

The base fee and shipping rates are stored in PostgreSQL and seeded
idempotently. All money fields (`product.price`, quote `amount`, settings
`baseFee`, and transaction snapshots) use the same integer COP units.
Creating a transaction snapshots the product name and price,
base fee, delivery fee, and calculated total. Creating a transaction checks
current stock only. Payment locks inventory and decrements it when the charge
is approved.
Guest `GET /transactions/:id` is keyed by UUID only (no auth yet).

### Payment API

Sandbox keys come from the [Wompi dashboard](https://comercios.wompi.co/). Copy `WOMPI_*` from `.env.example` into `.env`.

- `GET /payments/config` — public key plus fresh acceptance tokens (no private key)
- `GET /transactions/:id/widget-session` — signed payload for the Wompi checkout widget
- `POST /transactions/:id/pay` — card token body and required `Idempotency-Key` header
- `POST /transactions/:id/sync` — settle a widget payment by provider transaction id; requires `Idempotency-Key`

A transaction charges the cart lines sent in `items[]` (quantity included). Stock decreases only when Wompi reports `APPROVED`. The same idempotency key and body replay the stored response and do not create a second charge. When Wompi approves but stock cannot be decremented, the API/worker keep the order as `ERROR`, attempt a Wompi void, and the shopper is told not to retry (Phase 5 copy).

On localhost HTTP, the widget may omit `redirectUrl` (Wompi rejects non-HTTPS redirects); the in-widget callback still navigates to the result page with the provider id.

All JSON responses use `{ ok: true, data }` or `{ ok: false, error }`.

### Worker webhooks and reconciliation

The worker (`apps/worker`, port 3001) owns async settlement:

- `POST /webhooks/wompi` — verified Wompi Events (`transaction.updated` only)
- Interval jobs — stuck PENDING recovery (one provider status fetch → settle) and orphan PENDING expiry (`EXPIRED` after TTL)

Copy worker env from `apps/worker/.env.example` (or the shared root `.env`). Important keys:

| Variable | Default | Purpose |
| --- | --- | --- |
| `WOMPI_EVENTS_SECRET` | — | Event checksum secret (not the integrity secret) |
| `WEBHOOK_MAX_SKEW_SECONDS` | `300` | Reject events older/newer than 5 minutes |
| `STUCK_PENDING_AFTER_MS` | `120000` | Age before stuck job polls provider once |
| `ORPHAN_PENDING_TTL_MS` | `1800000` | Age before uncharged PENDING → `EXPIRED` |
| `JOB_INTERVAL_MS` | `60000` | Reconciliation tick |

**Event URL (Wompi dashboard):** point Sandbox/Production Events URL at the worker webhook, e.g. `https://<public-host>/webhooks/wompi`.

#### Tunnel smoke (manual)

1. Start stack (`pnpm dev`) so worker listens on `http://localhost:3001`.
2. Expose the worker with [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) or ngrok, e.g. `cloudflared tunnel --url http://localhost:3001` or `ngrok http 3001`.
3. Set the tunnel HTTPS URL + `/webhooks/wompi` as the Wompi **Event URL**.
4. Pay in the widget (or card) and leave before sync — webhook should settle `PENDING` → terminal status.
5. Replay the same event — no double stock decrement (idempotent `webhook:{providerId}:{status}`).
6. POST with a bad `X-Event-Checksum` — expect **400**, no DB mutation.
7. Abandon a PENDING order with no real provider id until `ORPHAN_PENDING_TTL_MS` — status becomes `EXPIRED`.
8. Force a stuck PENDING with a real provider id older than `STUCK_PENDING_AFTER_MS` — job recovers via one `getPaymentStatus` + settle.

Worker `GET /health` remains `{ status: "ok", role: "worker" }`.

### Frontend checkout smoke

Manual checks after `pnpm dev`:

1. Add two products with qty > 1 → checkout → Base fee / Shipping / Total match after Continue to payment.
2. Create order → Pay with card (sandbox) → result Approved; cart cleared.
3. Create order → Other methods (widget) → complete in-widget → result page syncs.
4. Zero stock on a line → Continue to payment shows out-of-stock copy that invites updating the cart (not a generic create error).
5. Edit details on the payment step → returns to Details with cart kept (orphan PENDING expires via the worker after TTL).
6. If pay/sync returns out of stock after a provider charge, the UI must say not to retry, show the order id, and point to support.

## CI

GitHub Actions (`.github/workflows/ci.yml`) on `pull_request` and `push` to `main`:

| Job | Gate | What it runs |
| --- | --- | --- |
| `quality` | **required*** | `pnpm lint`, `pnpm build`, `pnpm test:cov` (Node 22, pnpm 10.30.3). Web lint is `vue-tsc -p tsconfig.app.json` (SFCs + `src`; TypeScript **5.8** in `apps/web`). |
| `docker` | **required*** | Buildx builds for **api**, **worker**, and **web** (plus `nginx -t` on the web image) |
| `audit` | **advisory** | `pnpm audit --audit-level=high` with `continue-on-error` |

\*Workflow jobs fail the check when red, but GitHub still merges unless you enable **branch protection / rulesets** that require status checks `quality` and `docker` on `main`. Do that in repo Settings (Actions alone do not block merges).

Local audit: `pnpm audit:ci`. Unit/`test:cov` needs no Postgres. Enable **GitHub secret scanning + push protection** in repo settings (no gitleaks job). If audit is later made required, use an explicit in-repo allowlist — not silent skips.

### Web lint

`apps/web` pins TypeScript **5.8.3** so `vue-tsc` type-checks Vue SFCs (`tsconfig.app.json`). Other packages may use a newer TypeScript for Nest builds.

## Security

- API: Helmet (tighter CSP when Swagger is off in production), CORS allowlist (`CORS_ORIGIN`), ValidationPipe whitelist, no raw 500 bodies, JSON body limit ~256kb, `@nestjs/throttler` (global + stricter on create/pay/sync/get-by-id; health skipped).
- **Trust proxy:** off by default. Set `TRUST_PROXY=1` (or hop count) **only** behind Coolify/nginx that forwards `X-Forwarded-For`. Never enable when the API port is published directly (clients can spoof the header and bypass rate limits). `docker-compose.prod.yml` forces `TRUST_PROXY=false` for that reason.
- **Throttler storage:** in-memory per process. Keep **one API replica** unless you add shared store (e.g. Redis). Scaling replicas multiplies effective limits.
- Worker: Helmet + body limit + lightweight 5xx filter. **No** IP throttle on Wompi webhooks (checksum + skew + idempotency).
- Payment/Wompi failure paths redact `WOMPI_*` secrets and full `Authorization` header values (any scheme) from logs.
- Web nginx: `X-Content-Type-Options`, `Referrer-Policy`, frame denial / CSP suitable for the static SPA. Only public `VITE_*` (API URL).

### Residual risk — guest UUID access

`GET /transactions/:id` remains unauthenticated (guest checkout). Anyone who learns a transaction UUID can read that order. Mitigations today: UUID opacity, stricter throttling, and trust proxy (when correctly configured behind a proxy). Customer auth is out of scope for Phase 8.

## Deploy

Artifacts (Coolify-friendly):

| Path | Role |
| --- | --- |
| `apps/api/Dockerfile` | API image (root context; migrate-on-start then `node`) |
| `apps/worker/Dockerfile` | Worker image (root context; never migrates) |
| `apps/web/Dockerfile` | Vite build + nginx SPA (`VITE_API_URL` build-arg) |
| `docker-compose.prod.yml` | Postgres + api + worker + web smoke |
| `deploy/env.production.example` | Env template (not `.env.*`, so it is not gitignored) |
| `scripts/api-entrypoint.sh` | **Dist-only** TypeORM `migration:run`, then start (no `tsc`) |

Pinned compose ports: Postgres host **5434**, API **3000**, worker **3001**, web **8080**.

```bash
docker compose -f docker-compose.prod.yml up --build -d
curl -sf http://localhost:3000/health
curl -sf http://localhost:3001/health
curl -sf http://localhost:8080/
```

### Migrations and replicas

- Local/dev: `pnpm db:migrate` (may compile).
- Production container: entrypoint runs migrations from **already-built dist only**.
- **Ops:** keep **one API replica** always with the current in-memory throttler, and especially while migrations apply (or a one-shot migrate job that exits before scaling API). Concurrent `migration:run` is unsafe even with TypeORM’s migrations table.
- Compose/Coolify: worker (and web) must wait until API is **healthy** so migrate finishes before webhooks/jobs hit the schema.
- Seed remains manual (`pnpm db:seed`); never on every deploy.
- `GET /health` is process-up only (not a DB readiness probe).

### Coolify checklist

1. Three applications from the Dockerfiles above; **build context = repository root**; Dockerfile paths `apps/api/Dockerfile`, `apps/worker/Dockerfile`, `apps/web/Dockerfile`.
2. Env from `deploy/env.production.example` (set real secrets in the UI). `NODE_ENV=production`. `CORS_ORIGIN` = public web origin(s). Set `TRUST_PROXY=1` only when a reverse proxy forwards `X-Forwarded-For`; do not publish the API without that proxy.
3. Health: api/worker `/health`, web `/`. Start worker only after API is healthy (migrate-on-start).
4. Wompi **Events URL** → public worker URL + `/webhooks/wompi`.
5. Web build-arg `VITE_API_URL` = public API origin; rebuild web when that URL changes.
6. Ensure the proxy forwards `X-Forwarded-For` to the API.
7. Keep API at **1 replica** (throttler + migrate safety); seed separately if needed.
8. In GitHub: require checks `quality` and `docker` on `main` (branch protection / ruleset).

Runtime images for api/worker use a **pruned monorepo copy** (built `dist` + production `node_modules`). `pnpm deploy` was spiked; Nest package `imports` maps + pnpm v10 deploy defaults favor this fallback for both api and worker.
