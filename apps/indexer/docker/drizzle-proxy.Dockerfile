FROM oven/bun

WORKDIR /usr/src/app

COPY package.json ./
RUN bun install
COPY . .

ENV NODE_ENV production

RUN bun build ./src/http/drizzle-proxy/server.ts --outdir ./dist --target bun
RUN mv ./dist/server.js ./dist/drizzle-proxy-server.js
CMD ["bun", "run", "dist/drizzle-proxy-server.js"]