FROM node:22-alpine AS base
RUN apk add g++ make python3
RUN corepack enable pnpm

FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune indexer --docker

FROM base AS builder
WORKDIR /app
# copy lockfile and workspace files
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
# copy pruned workspace
COPY --from=pruner /app/out/json/ .
# install dependencies
RUN pnpm install --frozen-lockfile
# copy source files
COPY --from=pruner /app/out/full/ .
# build the app
RUN pnpm --filter indexer run build

FROM base AS runner
WORKDIR /squid
# copy built application
COPY --from=builder /app/apps/indexer/lib ./lib
COPY --from=builder /app/apps/indexer/db ./db
COPY --from=builder /app/apps/indexer/package.json ./package.json
COPY --from=builder /app/apps/indexer/commands.json ./commands.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
# setup squid commands
RUN echo -e "loglevel=silent\\nupdate-notifier=false" > /squid/.npmrc
CMD ["pnpm", "--filter", "indexer", "start"]