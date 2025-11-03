FROM oven/bun:1.3-slim

WORKDIR /usr/src/app

COPY package.json ./
RUN bun install
COPY src src

ENV NODE_ENV production

RUN bun build ./src/main.ts --outdir ./dist --target bun
RUN mv ./dist/main.js ./dist/import-server.js
CMD ["bun", "run", "dist/import-server.js"]