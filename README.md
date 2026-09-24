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
idempotently. Creating a transaction snapshots the product name and price,
base fee, delivery fee, and calculated total. Phase 3 only checks current
stock; reservation/decrement and the associated TOCTOU protection are deferred
to the payment phase. Request idempotency is also deferred.

All JSON responses use `{ ok: true, data }` or `{ ok: false, error }`.
