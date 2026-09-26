# Operations

Deploy and run the apps (API, worker, web) with shared Postgres and RabbitMQ. This guide covers Coolify, env, health, Wompi Events, and the local prod-like compose smoke.

## Coolify

1. Create **three applications**; **build context = repository root**; Dockerfiles under `apps/*/Dockerfile`.
2. Add a **RabbitMQ** resource (image `rabbitmq:4-management`) with a **persistent volume** on `/var/lib/rabbitmq`. Do **not** publish `5672` or `15672` publicly; API and worker reach Rabbit on the private network.
3. Copy env from [`deploy/env.production.example`](../deploy/env.production.example) into the Coolify UI (or a secret store). Do not commit real secrets. Use a non-guest Rabbit user in production.
4. Set `CORS_ORIGIN` to the public web origin(s) (comma-separated, no `*`).
5. Set `TRUST_PROXY=1` (or hop count) **only** behind a reverse proxy that sets `X-Forwarded-For`. Leave it off if the API port is exposed directly to clients.
6. Health probes: API and worker `GET /health`, web `GET /`. API health does **not** require RabbitMQ.
7. Boot order: postgres → rabbitmq → **API** (migrate-on-start) → **worker**.
8. Point the Wompi **Events URL** at the public **API** host + `/webhooks/wompi`.
9. Web image build-arg `VITE_API_URL` = public API origin; **rebuild the web image** when it changes.
10. Keep **one API replica** (in-memory throttler + migrate-on-start safety). Add Redis before scaling API replicas.
11. Run seed **manually** (`pnpm db:seed` or equivalent against the DB). Never seed on every deploy.

Artifacts:

| Artifact | Role |
| --- | --- |
| `apps/api/Dockerfile` | API — migrate-on-start from **dist**, then `node` |
| `apps/worker/Dockerfile` | Worker — never migrates |
| `apps/web/Dockerfile` | Vite build + nginx (`VITE_API_URL` build-arg) |
| `scripts/api-entrypoint.sh` | Dist-only `migration:run`, then start |
| `deploy/env.production.example` | Env template for Coolify / compose.prod |

See [ADR 0004](adr/0004-trust-proxy-and-single-replica.md) and [ADR 0005](adr/0005-dist-only-migrate-on-start.md).

## Environment (production-oriented)

Key variables (full template in `deploy/env.production.example`):

| Variable | Who | Notes |
| --- | --- | --- |
| `CORS_ORIGIN` | API | Browser origins allowlist |
| `TRUST_PROXY` | API | Off unless behind a real proxy |
| `RABBITMQ_URL` | API + worker | `amqp://user:pass@rabbitmq:5672` |
| `WOMPI_PUBLIC_KEY` / `WOMPI_PRIVATE_KEY` / `WOMPI_INTEGRITY_SECRET` | API (+ worker for gateway) | Card charge + widget signature |
| `WOMPI_EVENTS_SECRET` | API | Event checksum (not the integrity secret) |
| `WEBHOOK_MAX_SKEW_SECONDS` | API | Retained for docs; skew does not reject signed events |
| `STUCK_PENDING_AFTER_MS` / `ORPHAN_PENDING_TTL_MS` / `JOB_INTERVAL_MS` | Worker | Reconciliation timing |
| `OUTBOX_POLL_MS` | Worker | Outbox publisher interval (default 5000) |
| `VITE_API_URL` | Web build | Public API origin; bake at image build time |

## Local prod-like smoke

[`docker-compose.prod.yml`](../docker-compose.prod.yml) pins ports: Postgres **5434**, API **3000**, worker **3001**, web **8080**. RabbitMQ stays internal. `TRUST_PROXY` is forced off because the API port is published directly. Neither API nor worker blocks boot on Rabbit health — they reconnect via `RabbitConnectionManager`. The worker still `depends_on` the API with `condition: service_healthy` so migrations finish first.

```bash
docker compose -f docker-compose.prod.yml up --build -d
curl -sf http://localhost:3000/health
curl -sf http://localhost:3001/health
curl -sf http://localhost:8080/
```

For day-to-day local development (Vite + migrate/seed scripts), use the main [`README.md`](../README.md) setup (`docker compose` Postgres on **5433**, RabbitMQ on **5672** / management **15672**, `pnpm dev`).
