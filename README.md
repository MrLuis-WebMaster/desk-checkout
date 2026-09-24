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
docker compose up -d
pnpm dev
```

| App | URL |
| --- | --- |
| Web | http://localhost:5173 |
| API | http://localhost:3000/health |
| Worker | http://localhost:3001/health |

PostgreSQL listens on `localhost:5432`. Database, user, and password are `checkout`.
