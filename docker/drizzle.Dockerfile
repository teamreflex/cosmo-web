FROM oven/bun

WORKDIR /usr/src/app

RUN ls

COPY package.json ./
RUN bun install
COPY . .

ENV NODE_ENV production

RUN bun build ./http-proxy.ts --outdir ./dist --target bun
CMD ["bun", "run", "dist/http-proxy.js"]