# Checkout

`apps/web` en http://localhost:5173, `apps/api` en http://localhost:3000/health, `apps/worker` en http://localhost:3001/health. PostgreSQL del compose escucha en `localhost:5433`.

## Run and debug

El arranque completo está en `README.md`:

1. `pnpm install`
2. Copiar `.env.example`, `apps/web/.env.example` y `apps/worker/.env.example`
3. `docker compose up -d`
4. `pnpm db:migrate` y `pnpm db:seed`
5. `pnpm dev`

Vuelve a correr `pnpm db:migrate` y `pnpm db:seed` después de cambiar el esquema.
