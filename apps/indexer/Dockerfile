FROM oven/bun:1.4.0-slim AS bun

# stage 1: prune workspace
FROM bun AS pruner
WORKDIR /app
COPY . .
RUN bunx turbo@2.10.12 prune indexer --docker

# stage 2: install dependencies
FROM bun AS installer
WORKDIR /app
COPY --from=pruner /app/out/bun.lock ./bun.lock
COPY --from=pruner /app/out/json/ .
RUN bun install --frozen-lockfile
COPY --from=pruner /app/out/full/ .

# stage 3: build
FROM bun AS builder
WORKDIR /app
COPY --from=installer /app .
RUN cd apps/indexer && bun run build

# stage 4: run
FROM bun AS runner
WORKDIR /app/apps/indexer
ENV NODE_ENV=production
COPY --from=builder /app/apps/indexer/lib ./lib
COPY --from=builder /app/apps/indexer/db ./db
COPY --from=builder /app/apps/indexer/package.json ./package.json
COPY --from=builder /app/apps/indexer/node_modules ./node_modules
COPY --from=builder /app/node_modules/.bun /app/node_modules/.bun
COPY --from=builder /app/packages /app/packages
CMD ["bun", "run", "start"]
