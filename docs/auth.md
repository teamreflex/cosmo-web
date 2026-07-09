# Auth — Better Auth

The web app uses Better Auth with Discord/Twitter OAuth. Config lives in `apps/web/src/lib/server/auth.server.ts`; the auth tables are hand-tuned in the drizzle schema files.

## Schema generation

`bunx @better-auth/cli generate` **clobbers** the hand-tuned auth schema (citext columns, custom indexes, the current relations API). When a plugin adds tables: regenerate → `git restore` the schema file → transplant only the new table, re-adding FKs and `mode: "date"` timestamps by hand.

## API Keys (admin-administered)

- The `@better-auth/api-key` **server plugin mounts `/api/auth/api-key/*` for all logged-in users** — the client plugin is only typed sugar, omitting it protects nothing, and there is no built-in role gate. `hooks.before` in `auth.server.ts` therefore 404s the HTTP routes: `ctx.path?.startsWith("/api-key/") && (ctx.request || ctx.headers)`. Optional chaining on `ctx.path` is required — server-only endpoints have no path.
- Admin operations run in server fns gated by `adminMiddleware`: **create** via `auth.api.createApiKey({ body: { userId, ... } })` with NO `headers` (passing headers flips to client mode and ignores `userId`); **list/update/delete** via direct Drizzle on the `apikey` table (the plugin's own endpoints are session-self-scoped).
- Keep `@better-auth/api-key` in version lockstep with `better-auth`.
- `rateLimit: { enabled: false }` on the plugin is deliberate — the default (10 verifications/day per key) would silently break polling consumers of the public API routes.
- Public API routes authenticate via `verifyRequestApiKey` (`lib/server/api-key.server.ts`): reads `Authorization` (optional `Bearer` prefix) or `x-api-key`, then calls the server-only `auth.api.verifyApiKey` — which has no HTTP path, so it's unaffected by the route block.
