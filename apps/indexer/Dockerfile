# stage 1: prune workspace with bun
FROM oven/bun:1.3.1-slim AS pruner
WORKDIR /app
COPY . .
RUN bunx turbo prune indexer --docker

# stage 2: install dependencies with bun
FROM oven/bun:1.3.1-slim AS installer
WORKDIR /app
COPY --from=pruner /app/out/bun.lock ./bun.lock
COPY --from=pruner /app/out/json/ .
RUN bun install --frozen-lockfile
COPY --from=pruner /app/out/full/ .

# stage 3: build with node
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=installer /app .
# this should be kept in sync with the build script in package.json
RUN cd apps/indexer && rm -rf lib/ && npx tsc -p tsconfig.build.json

# stage 4: run with node
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/indexer/lib ./lib
COPY --from=builder /app/apps/indexer/db ./db
COPY --from=builder /app/apps/indexer/package.json ./package.json
COPY --from=builder /app/apps/indexer/commands.json ./commands.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
RUN npm install -g @subsquid/commands && mv $(which squid-commands) /usr/local/bin/sqd
CMD ["sqd", "process:prod"]