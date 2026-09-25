# syntax=docker/dockerfile:1
# Build context: repository root. Same pruned-copy pattern as apps/api.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/settlement/package.json ./packages/settlement/
COPY packages/settlement-typeorm/package.json ./packages/settlement-typeorm/
COPY packages/tsconfig/package.json ./packages/tsconfig/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN rm -f apps/*/tsconfig.tsbuildinfo packages/*/tsconfig.tsbuildinfo \
  && pnpm turbo run build --filter=@checkout/worker...

FROM node:22-bookworm-slim AS prod-deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/settlement/package.json ./packages/settlement/
COPY packages/settlement-typeorm/package.json ./packages/settlement-typeorm/
COPY packages/tsconfig/package.json ./packages/tsconfig/
RUN pnpm install --frozen-lockfile --prod

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd --system --gid 1001 nestjs \
  && useradd --system --uid 1001 --gid nestjs nestjs

COPY --from=prod-deps /app ./
COPY --from=build /app/apps/worker/dist ./apps/worker/dist
COPY --from=build /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /app/packages/settlement/dist ./packages/settlement/dist
COPY --from=build /app/packages/settlement-typeorm/dist ./packages/settlement-typeorm/dist

RUN chown -R nestjs:nestjs /app
USER nestjs
WORKDIR /app/apps/worker
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
