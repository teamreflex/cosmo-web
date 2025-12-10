FROM oven/bun:1.3.3-alpine as base

FROM base AS pruner
WORKDIR /app
COPY . .
RUN bunx turbo@2.6.3 prune schedules --docker

FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/bun.lock ./bun.lock
COPY --from=pruner /app/out/json/ .
RUN bun install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN bun run --filter schedules build

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/apps/schedules/dist ./dist
COPY --from=builder /app/apps/schedules/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
CMD ["bun", "run", "--bun", "./dist/main.js"]
