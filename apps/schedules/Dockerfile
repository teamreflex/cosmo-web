FROM oven/bun:1.3.5-alpine AS base

FROM base AS pruner
WORKDIR /app
COPY . .
RUN bun install -g turbo@2.6.3
RUN turbo prune schedules --docker

FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/bun.lock ./bun.lock
COPY --from=pruner /app/out/json/ .
# TODO: fix --frozen-lockfile
RUN bun install
COPY --from=pruner /app/out/full/ .
RUN bun run --filter schedules build

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/apps/schedules/dist ./dist
COPY --from=builder /app/apps/schedules/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
CMD ["bun", "run", "--bun", "./dist/main.js"]
