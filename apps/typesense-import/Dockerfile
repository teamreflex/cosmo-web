FROM oven/bun:1.3-slim AS pruner
WORKDIR /app
COPY . .
RUN bunx turbo prune typesense-import --docker

FROM oven/bun:1.3-slim AS builder
WORKDIR /app
# install pnpm
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://get.pnpm.io/install.sh | sh - && \
    mv /root/.local/share/pnpm/pnpm /usr/local/bin/pnpm
# copy lockfile and workspace files
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
# copy pruned workspace
COPY --from=pruner /app/out/json/ .
# install dependencies
RUN pnpm install --frozen-lockfile
# copy source files
COPY --from=pruner /app/out/full/ .
# build the app using turbo (which will use bun)
RUN bunx turbo build --filter typesense-import

FROM oven/bun:1.3-slim AS runner
WORKDIR /app
ENV NODE_ENV production
# copy built application and workspace packages
COPY --from=builder /app/apps/typesense-import/dist ./dist
COPY --from=builder /app/apps/typesense-import/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
# run with bun directly
CMD ["bun", "run", "--bun", "dist/main.js"]