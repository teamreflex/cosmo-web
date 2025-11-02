FROM node:22-alpine AS node
FROM node AS node-with-gyp
RUN apk add g++ make python3
RUN npm install -g pnpm 

FROM node-with-gyp AS builder
WORKDIR /squid
ADD package.json .
ADD pnpm-lock.yaml .
# remove if needed
ADD db db
# remove if needed
ADD schema.graphql .
RUN pnpm install --frozen-lockfile
ADD tsconfig.json .
ADD src src
RUN pnpm run build

FROM node-with-gyp AS deps
WORKDIR /squid
ADD package.json .
ADD pnpm-lock.yaml .
RUN pnpm install --frozen-lockfile --prod

FROM node AS squid
WORKDIR /squid
COPY --from=deps /squid/package.json .
COPY --from=deps /squid/pnpm-lock.yaml .
COPY --from=deps /squid/node_modules node_modules
COPY --from=builder /squid/lib lib
# remove if no db folder
COPY --from=builder /squid/db db
# remove if no schema.graphql is in the root
COPY --from=builder /squid/schema.graphql schema.graphql
# remove if no commands.json is in the root
ADD commands.json .
RUN echo -e "loglevel=silent\\nupdate-notifier=false" > /squid/.npmrc
RUN npm i -g @subsquid/commands && mv $(which squid-commands) /usr/local/bin/sqd
ENV PROCESSOR_PROMETHEUS_PORT 3000