# Checkout

TypeScript monorepo for a product checkout: Vue 3 + Pinia on the frontend, NestJS modular monolith on the backend.

## Phases

1. Monorepo scaffold, shared contracts, health endpoints, Pinia shell.
2. Catalog, inventory, and database seed.
3. Customers, delivery, and transactions.
4. Checkout orchestration and payment provider.
5. Frontend checkout flow.
6. Async worker.
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

- `GET /shipping-methods?region=BOG` — active shipping methods with their regional fee
- `GET /checkout/settings` — current base fee
- `POST /transactions` — creates a guest transaction in `PENDING` status
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
- `POST /transactions/:id/pay` — card token body and required `Idempotency-Key` header

A transaction charges one product unit. Stock decreases only when Wompi reports `APPROVED`. The same idempotency key and body replay the stored response and do not create a second charge. Vue checkout and Wompi webhooks stay in later phases. The cart quantity in the browser is not sent to this API yet.

All JSON responses use `{ ok: true, data }` or `{ ok: false, error }`.
