# Testing

## Automated

```bash
pnpm test       # unit tests (turbo)
pnpm test:cov   # coverage with an 80% line/statement gate per package
```

`pnpm test:cov` enforces **80% lines and statements**. Branch coverage is not a hard gate.

| Package | Runner |
| --- | --- |
| `apps/api`, `apps/worker`, `packages/*` | **Jest** (`jest.config.cjs`) |
| `apps/web` | **Vitest** (`vite.config.ts`; `.vue` files stay outside coverage) |

Coverage exclusions (ORM entities, Nest modules, migrations, `main.ts`, DTOs, and similar) live in each package’s Jest or Vitest config — for example `apps/api/jest.config.cjs`, `apps/worker/jest.config.cjs`, `packages/settlement/jest.config.cjs`, and `apps/web/vite.config.ts`. Point readers there instead of duplicating exclude tables in this guide. Latest percentages are copied into the README coverage table after a full `pnpm test:cov` run.

CI runs lint, build, and `test:cov` on the `quality` job (`.github/workflows/ci.yml`), plus Docker image builds and `nginx -t` on the web image.

## Manual smokes

### Frontend checkout

With `pnpm dev` (web :5173, API :3000, worker :3001):

1. **Card** — Create a guest order, pay with a Wompi sandbox card, confirm status reaches `APPROVED` (or the expected decline) and stock moves only on approve.
2. **Widget** — Complete checkout via the Wompi widget path; same settlement expectations.
3. **Out of stock** — Reduce stock so create fails, or force a path where Wompi approves but decrement cannot succeed → order `ERROR`, UI tells the shopper not to retry.

### Webhook tunnel

1. Run `pnpm dev`, then expose the worker:

   ```bash
   cloudflared tunnel --url http://localhost:3001
   # or: ngrok http 3001
   ```

2. Set the Wompi dashboard **Events URL** to that HTTPS origin + `/webhooks/wompi`.
3. Pay and abandon before sync — the webhook should settle.
4. **Idempotency** — Replay the same event; stock must not decrement twice.
5. **Bad checksum** — Tampered payload must not mutate the order.
6. **Orphan EXPIRED** — Leave an uncharged `PENDING` until past `ORPHAN_PENDING_TTL_MS`; reconciliation should mark `EXPIRED`.
7. **Stuck recovery** — Charged but unsettled `PENDING` older than `STUCK_PENDING_AFTER_MS` should settle via the stuck job through the same settlement writer.
