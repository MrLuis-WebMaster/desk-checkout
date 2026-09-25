# ADR 0005: Dist-only migrate-on-start

## Status

Accepted

## Context

Production images should not compile TypeScript at boot. Schema must apply before the API accepts traffic and before the worker starts. Concurrent `migration:run` across replicas is unsafe.

## Decision

`scripts/api-entrypoint.sh` runs TypeORM `migration:run` against the **dist** data source, then `exec node dist/main.js`. Never run `tsc` in the container. The worker image never migrates. Keep one API replica while migrate-on-start is used; compose waits for API healthy before starting the worker.

## Consequences

- Migrations ship with the API image; deploys apply schema before listen.
- Seed remains a manual operator step (not part of the entrypoint).
- Scaling API replicas requires a separate migrate job or leader election first.
