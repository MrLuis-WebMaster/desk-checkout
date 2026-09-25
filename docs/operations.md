# Operations

Deploy and run the three apps (API, worker, web) with a shared Postgres. This guide covers Coolify, env, health, Wompi Events, and the local prod-like compose smoke.

## Coolify

1. Create **three applications**; **build context = repository root**; Dockerfiles under `apps/*/Dockerfile`.
2. Copy env from [`deploy/env.production.example`](../deploy/env.production.example) into the Coolify UI (or a secret store). Do not commit real secrets.
3. Set `CORS_ORIGIN` to the public web origin(s) (comma-separated, no `*`).
4. Set `TRUST_PROXY=1` (or hop count) **only** behind a reverse proxy that sets `X-Forwarded-For`. Leave it off if the API port is exposed directly to clients.
5. Health probes: API and worker `GET /health`, web `GET /`.
6. Start the **worker after the API is healthy** so dist-only migrations finish first.
7. Point the Wompi **Events URL** at the public worker host + `/webhooks/wompi`.
8. Web image build-arg `VITE_API_URL` = public API origin; **rebuild the web image** when it changes.
9. Keep **one API replica** (in-memory throttler + migrate-on-start safety). Add Redis before scaling API replicas.
10. Run seed **manually** (`pnpm db:seed` or equivalent against the DB). Never seed on every deploy.

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
| `WOMPI_PUBLIC_KEY` / `WOMPI_PRIVATE_KEY` / `WOMPI_INTEGRITY_SECRET` | API | Card charge + widget signature |
| `WOMPI_EVENTS_SECRET` | Worker | Event checksum (not the integrity secret) |
| `WEBHOOK_MAX_SKEW_SECONDS` | Worker | Default `300` |
| `STUCK_PENDING_AFTER_MS` / `ORPHAN_PENDING_TTL_MS` / `JOB_INTERVAL_MS` | Worker | Reconciliation timing |
| `VITE_API_URL` | Web build | Public API origin; bake at image build time |

## Local prod-like smoke

[`docker-compose.prod.yml`](../docker-compose.prod.yml) pins ports: Postgres **5434**, API **3000**, worker **3001**, web **8080**. `TRUST_PROXY` is forced off because the API port is published directly. The worker `depends_on` the API with `condition: service_healthy`.

```bash
docker compose -f docker-compose.prod.yml up --build -d
curl -sf http://localhost:3000/health
curl -sf http://localhost:3001/health
curl -sf http://localhost:8080/
```

For day-to-day local development (Vite + migrate/seed scripts), use the main [`README.md`](../README.md) setup (`docker compose` Postgres on **5433**, `pnpm dev`).
