# Checkout

TypeScript monorepo for a product checkout: Vue 3 + Pinia on the frontend, NestJS modular monolith on the backend.

## Phases

1. ~~Monorepo scaffold, shared contracts, health endpoints, Pinia shell.~~ **Done**
2. ~~Catalog, inventory, and database seed.~~ **Done**
3. ~~Customers, delivery, and transactions.~~ **Done**
4. ~~Checkout orchestration and payment provider.~~ **Done**
5. ~~Frontend checkout flow.~~ **Done**
6. Async worker. *(Wompi webhooks live here.)*
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

A transaction charges the cart lines sent in `items[]` (quantity included). Stock decreases only when Wompi reports `APPROVED`. The same idempotency key and body replay the stored response and do not create a second charge. Asynchronous Wompi webhooks are Phase 6 (worker).

On localhost HTTP, the widget may omit `redirectUrl` (Wompi rejects non-HTTPS redirects); the in-widget callback still navigates to the result page with the provider id.

All JSON responses use `{ ok: true, data }` or `{ ok: false, error }`.

### Frontend checkout smoke

Manual checks after `pnpm dev`:

1. Add two products with qty > 1 → checkout → Base fee / Shipping / Total match after Continue to payment.
2. Create order → Pay with card (sandbox) → result Approved; cart cleared.
3. Create order → Other methods (widget) → complete in-widget → result page syncs.
4. Zero stock on a line → Continue to payment shows out-of-stock copy that invites updating the cart (not a generic create error).
5. Edit details on the payment step → returns to Details with cart kept (server may still hold a PENDING orphan until Phase 6).
6. If pay/sync returns out of stock after a provider charge, the UI must say not to retry, show the order id, and point to support.
