FROM oven/bun:1.3.13-slim AS base

FROM base AS pruner
WORKDIR /app
COPY . .
RUN bun install -g turbo@2.9.6
RUN turbo prune archive --docker

FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/bun.lock ./bun.lock
COPY --from=pruner /app/out/json/ .
RUN bun install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN bun run --filter archive build

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/apps/archive/dist ./dist
COPY --from=builder /app/apps/archive/drizzle ./drizzle
COPY --from=builder /app/apps/archive/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
CMD ["bun", "run", "--bun", "./dist/main.js"]
