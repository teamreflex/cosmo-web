FROM oven/bun:1.4.4-slim AS bun

# stage 1: prune workspace
FROM bun AS pruner
WORKDIR /app
COPY . .
RUN bunx turbo@2.11.9 prune web --docker

# stage 2: build
FROM bun AS builder
WORKDIR /app
COPY --from=pruner /app/out/bun.lock ./bun.lock
COPY --from=pruner /app/out/json/ .
RUN bun install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN VITE_COMMIT_SHA=${SOURCE_COMMIT:-dev} bun --filter web build:prod

# stage 3: production dependencies
FROM bun AS deps
WORKDIR /app
COPY --from=pruner /app/out/bun.lock ./bun.lock
COPY --from=pruner /app/out/json/ .
RUN bun install --frozen-lockfile --production

# stage 4: run
FROM bun AS runner
WORKDIR /app/apps/web
ENV NODE_ENV=production
# coolify's healthcheck needs curl or wget, busybox is static and acts as wget by name
COPY --from=busybox:1.37-musl /bin/busybox /usr/local/bin/wget
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/apps/web/node_modules ./node_modules
COPY --from=builder /app/apps/web/dist ./dist
COPY --from=builder /app/apps/web/drizzle ./drizzle
COPY --from=builder /app/apps/web/package.json /app/apps/web/main.ts /app/apps/web/instrument.ts /app/apps/web/migrate.ts ./
# instrument.ts is preloaded as raw TS, so its imports ship as source
COPY --from=builder /app/apps/web/src/lib/universal/errors ./src/lib/universal/errors
CMD ["sh", "-c", "bun migrate.ts && exec bun --preload ./instrument.ts main.ts"]
