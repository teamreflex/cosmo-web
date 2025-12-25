FROM oven/bun:1.3.5-alpine AS base

FROM base AS pruner
WORKDIR /app
COPY . .
RUN bun install -g turbo@2.7.2
RUN turbo prune typesense-import --docker

FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/bun.lock ./bun.lock
COPY --from=pruner /app/out/json/ .
# TODO: fix --frozen-lockfile
RUN bun install
COPY --from=pruner /app/out/full/ .
RUN bun run --filter typesense-import build

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/apps/typesense-import/dist ./dist
COPY --from=builder /app/apps/typesense-import/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
CMD ["bun", "run", "--bun", "./dist/main.js"]
