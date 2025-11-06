FROM node:22-alpine AS node
FROM node AS node-with-gyp
RUN apk add g++ make python3
RUN npm install -g pnpm 

FROM node-with-gyp AS builder
WORKDIR /squid
ADD package.json .
ADD pnpm-lock.yaml .
ADD db db
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
COPY --from=builder /squid/db db
ADD commands.json .
RUN echo -e "loglevel=silent\\nupdate-notifier=false" > /squid/.npmrc
RUN npm i -g @subsquid/commands && mv $(which squid-commands) /usr/local/bin/sqd
CMD ["sqd", "process:prod"]