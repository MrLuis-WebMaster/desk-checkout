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

Coverage exclusions (ORM entities, Nest modules, migrations, `main.ts`, DTOs, and similar) live in each package’s Jest or Vitest config. Latest percentages are copied into the README coverage table after a full `pnpm test:cov` run.

CI runs lint, build, and `test:cov` on the `quality` job (`.github/workflows/ci.yml`), plus a dedicated RabbitMQ integration job for `@checkout/messaging`, plus Docker image builds and `nginx -t` on the web image.

### RabbitMQ integration (optional locally)

```bash
docker compose up -d rabbitmq
RABBITMQ_URL=amqp://guest:guest@localhost:5672 pnpm --filter @checkout/messaging test:integration
```

`pnpm test` / `test:cov` do **not** require a live broker.

## Manual smokes

### Frontend checkout

With `pnpm dev` (web :5173, API :3000, worker :3001, RabbitMQ :5672):

1. **Card** — Create a guest order, pay with a Wompi sandbox card, confirm status reaches `APPROVED` (or the expected decline) and stock moves only on approve. Delivery should show `READY` when approved.
2. **Widget** — Complete checkout via the Wompi widget path; same settlement expectations.
3. **Out of stock** — Reduce stock so create fails, or force a path where Wompi approves but decrement cannot succeed → order `ERROR`, delivery `CANCELLED`, UI tells the shopper not to retry.

### Webhook tunnel

1. Run `pnpm dev`, then expose the **API**:

   ```bash
   cloudflared tunnel --url http://localhost:3000
   # or: ngrok http 3000
   ```

2. Set the Wompi dashboard **Events URL** to that HTTPS origin + `/webhooks/wompi`.
3. Pay and abandon before sync — the webhook should publish to RabbitMQ and the worker should settle.
4. **Idempotency** — Replay the same event; stock must not decrement twice.
5. **Bad checksum** — Tampered payload must not mutate the order.
6. **Orphan EXPIRED** — Leave an uncharged `PENDING` until past `ORPHAN_PENDING_TTL_MS`; reconciliation should mark `EXPIRED` and delivery `CANCELLED`.
7. **Stuck recovery** — Charged but unsettled `PENDING` older than `STUCK_PENDING_AFTER_MS` should settle via the stuck job through the same settlement writer.

### Resilience checklist

| Scenario | Expectation |
| --- | --- |
| Worker off, webhook arrives | Message stays Ready in `payment.events`; when worker returns, it settles |
| Duplicate payment event | Stock decrements once (idempotency) |
| Consumer throws | Retry via `payment.events.retry`, then `payment.events.dlq` |
| Browser closed mid-pay | Backend still finishes via webhook / sync / reconciliation |
| Webhook lost | Stuck reconciliation recovers from Wompi |
| Rabbit down | Checkout/pay/sync still work; webhook returns 503; outbox keeps `order.confirmed` until the next publisher cycle |
