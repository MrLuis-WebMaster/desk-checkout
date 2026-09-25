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

## Features and plans

Solo el agente principal delega, una vez y en serie. Espera a que uno termine antes de lanzar el siguiente. No abras copias en paralelo de la misma tarea.

Si este chat ya es `planner`, `implementer` o `verifier`, haz ese trabajo y no lances a ninguno de los tres.

- Feature o cambio de varios archivos, sin plan aprobado: `planner`, luego `implementer`, luego `verifier`.
- Ejecutar un plan ya aprobado: `implementer`, luego `verifier`.
- Un solo archivo: hazlo en este chat, sin esos agentes.
