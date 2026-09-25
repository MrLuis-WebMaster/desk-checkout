# Checkout

TypeScript monorepo for a product checkout: Vue 3 + Pinia on the frontend, NestJS modular monolith on the backend.

## Phases

1. ~~Monorepo scaffold, shared contracts, health endpoints, Pinia shell.~~ **Done**
2. ~~Catalog, inventory, and database seed.~~ **Done**
3. ~~Customers, delivery, and transactions.~~ **Done**
4. ~~Checkout orchestration and payment provider.~~ **Done**
5. ~~Frontend checkout flow.~~ **Done**
6. ~~Async worker + Wompi webhooks.~~ **Done**
7. Tests above 80% coverage.
8. Security, CI, and deployment.

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
