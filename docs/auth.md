# Auth

Better Auth runs inside apps/web at `/api/auth/*`, configured in `apps/web/src/lib/server/auth.server.ts`. COSMO links, public users and account deletion are in [`accounts.md`](accounts.md); reports and the staff audit log are in [`moderation.md`](moderation.md).

## Better Auth setup

- Users sign in with email and password, Discord or X. Sign-up sends a verification email but doesn't require it (`requireEmailVerification: false`).
- `better-auth`, `@better-auth/api-key` and `@better-auth/drizzle-adapter` are pinned to one version in the root catalog. Upgrade them together.
- No cookie cache is configured, so every request reads `role`, `banned` and `ban_expires` from the user row. A role change or a ban applies from the user's next request.
- `session.freshAge: 0` turns off Better Auth's own fresh-session checks. Account deletion's freshness rule is Apollo's own ([`accounts.md`](accounts.md#account-deletion)).
- `trustedOrigins` holds only `baseUrl()`. A POST that carries cookies must send a matching `Origin` header, or it fails with `MISSING_OR_NULL_ORIGIN` or `INVALID_ORIGIN`.
- OAuth access and refresh tokens are encrypted on write with AES-256-GCM, keyed by `BETTER_AUTH_SECRET` read as hex. Nothing in the repo decrypts them. The secret's format is in [`tooling.md`](tooling.md).
- The browser client (`lib/client/auth.ts`) has no admin or api-key plugin. Staff work goes through server functions.

| Plugin                         | Used for                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------- |
| `username`                     | Apollo usernames, 3 to 20 letters and digits                                  |
| `admin(adminPluginOptions)`    | role and ban columns, the sign-in refusal for banned users, `unbanUser`       |
| `@better-auth/api-key`         | keys for the public API routes ([API keys](#api-keys))                        |
| `jwt`                          | chat tokens ([Chat tokens](#chat-tokens))                                     |
| `server-only-currency` (local) | keeps `currency` out of client writes ([Display currency](#display-currency)) |
| `tanstackStartCookies`         | sets cookies from server functions                                            |

`hooks.before` 404s two plugin route families when they are called over HTTP:

| Path         | Refused when                          | Why                                                                                                  |
| ------------ | ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `/api-key/*` | `ctx.request` or `ctx.headers` is set | the plugin serves every signed-in user; only header-less server calls may manage keys                |
| `/admin/*`   | `ctx.request` is set                  | server functions call the plugin with the caller's headers, so testing headers would refuse them too |

### Social sign-in can change the email

- Discord and X run with `overrideUserInfoOnSignIn`, and account linking runs with `allowDifferentEmails`. A sign-in can overwrite `email` and `email_verified`, which decide [account protection](#protected-accounts).
- An X account with no confirmed email stores the X username as the email. Such an account has no deliverable email.
- Both behaviours are deliberate.

## Schema generation

The Better Auth tables and the `user_role` enum live in `packages/database/src/auth.ts`, which is hand-tuned: citext usernames, custom indexes, `mode: "date"` timestamps. `bun run auth:generate` (apps/web) writes straight over it.

When a plugin adds tables or columns:

1. Run `bun run auth:generate`.
2. Note the new tables and columns, then `git restore packages/database/src/auth.ts`.
3. Copy in only the new tables and columns by hand, re-adding foreign keys and `mode: "date"` timestamps.
4. Generate a migration ([`migrations.md`](migrations.md)).

- `user.role` is the `user_role` pg enum, `NOT NULL DEFAULT 'user'`. It rejects Better Auth's comma-joined multi-role form.
- The enum's values mirror `roleNames` in `@apollo/auth`. `apps/web/scripts/seed-staff.ts` types its rows with `Role`, so the two can't drift without a compile error.
- Drizzle selects every declared auth column on each session lookup. Dropping a column follows the two-release procedure in [`migrations.md`](migrations.md).

## Roles and permissions

Roles and the access-control `statement` are defined once in `packages/auth/src/index.ts` ([`packages/auth/README.md`](../packages/auth/README.md)). Each role holds every permission of the roles ranked below it.

| Permission                                                              | user | tester | moderator | admin |
| ----------------------------------------------------------------------- | ---- | ------ | --------- | ----- |
| `market: access`                                                        |      | x      | x         | x     |
| `trade: read-any, cancel-any, resolve-dispute, remove-message, message` |      |        | x         | x     |
| `listing: remove-any`, `feedback: remove-any`                           |      |        | x         | x     |
| `report: read, resolve, escalate`                                       |      |        | x         | x     |
| `user: ban, set-role`                                                   |      |        |           | x     |
| `site: manage`, `audit: read`, `cosmo: history`                         |      |        |           | x     |

- Testers exist so people can try the market while it is gated. The gate, invites, the launch step and the kill switch are in [`trades/feedback.md`](trades/feedback.md).
- Signed-out visitors are checked as `user`.
- Never set `adminUserIds` in `adminPluginOptions`, because it bypasses every permission check.
- Impersonation and session management are absent from the statement, so no role can be granted them. apps/chat also refuses impersonated sessions.
- Better Auth types `session.user.role` as `string`. Narrow it with `parseRole()`, which maps unknown and comma-joined values to `"user"`. Rows read through Drizzle are already typed by the enum.
- The role travels only in the viewer's own payloads (`GetAccount.role`, Better Auth's `get-session`), never on `PublicUser`.

## Where permissions are checked

The server function check is the authoritative one. Route guards and UI checks only decide what to show.

```
  browser             apps/web
  -------             ------------------------------------------------------------
  navigate -------->  route beforeLoad
                        /admin layout  can(role, ADMIN_SHELL_PERMISSIONS)  else redirect /
                        admin page     requirePermission(anyOf)            else notFound()
                        market pages   requireMarketAccess()               else site 404
  render ---------->  useHasPermission()(perms)
                        role from GetAccount; hides links, protects nothing

  server fn ------->  authenticatedMiddleware   session + user row
                      staffMiddleware(perms)    parseRole + can(), else "forbidden"
                      guardUserChange()         ban, unban, set role only

  /api/auth/* ----->  hooks.before              /admin/*, /api-key/* -> 404
```

- Gate a staff server function with `staffMiddleware(permissions)` (`lib/server/middlewares.ts`). It adds `role` to the context.
- Staff don't need a COSMO link. Chain `cosmoMiddleware` after `staffMiddleware` only when the handler needs the caller's address.
- How `requirePermission()` and `requireMarketAccess()` gate routes is in [`tanstack.md`](tanstack.md#gating).
- `ADMIN_SHELL_PERMISSIONS` (`components/admin/common.ts`) is `report: read`, so testers never see the admin shell.

## Staff changes to accounts

Ban, unban and set role each run `guardUserChange()` (`lib/server/staff-users.server.ts`) before anything else. It loads the target (`user_not_found`) and applies `userChangeRefusal()` from `@apollo/auth/guard`:

| Refusal          | When                                                                            |
| ---------------- | ------------------------------------------------------------------------------- |
| `protected_user` | the target is a [protected account](#protected-accounts), whoever the caller is |
| `self_ban`       | the caller bans themselves (unbanning themselves is allowed)                    |
| `self_demotion`  | the caller lowers their own role (same or higher is allowed)                    |

A new staff action that changes an account's access runs `guardUserChange()` too. The guard runs before the admin plugin is called, because the plugin's own refusals aren't `ExpectedError`s.

### Protected accounts

- `PROTECTED_EMAIL_DOMAINS` is an optional comma-separated list of email domains. Matching is exact and case-insensitive: `team-reflex.com` matches neither `sub.team-reflex.com` nor `evil-team-reflex.com`.
- An account is protected when its email is on a listed domain and `email_verified` is true. Only a verified email counts, because sign-up doesn't require verification and anyone could otherwise register a protected address.
- Protection follows the account's current email, which a [social sign-in can overwrite](#social-sign-in-can-change-the-email).
- `protectionFor()` returns null for roles without `user: ban`, so nobody without ban rights can map out which accounts are protected. The report detail's `protected` flag uses it.

### Ban

`$banUser` (`lib/functions/staff-users.ts`) writes the ban itself instead of calling the plugin, so the ban and its trade sweep commit in one transaction (`banAndSweep()`).

```
  $banUser (user: ban)
    guardUserChange: protected_user | self_ban
    +-- one transaction ---------------------------------------------------------+
    | lock the user + every counterparty to notify FOR NO KEY UPDATE, id order   |
    | re-read trades and offers (one may have landed while the ban waited)       |
    | the acting admin has a live trade with the user?   -> ban_trade_party      |
    | user: banned, ban_reason, ban_expires (null = permanent)                   |
    | sweep trades, listings and offers (docs/trades/lifecycle.md)               |
    | staff_audit user:ban; resolve open reports on the linked target            |
    +----------------------------------------------------------------------------+
    after commit
      deleteUserSessions -> session.delete.after per live session -> disconnect
      publish banned ----------------------------------------------> user-events
      publish each disputed trade ---------------------------------> trade-events

  next sign-in   ban active -> BANNED_USER
                 ban lapsed -> the plugin clears banned (no audit row, no event)
```

- Treat a ban as active only when `isBanActive()` (`@apollo/auth/guard`) holds, never on `banned` alone.
- `ban_trade_party` exists because the ban would put the admin's own trade on hold under a dispute they filed. Another admin bans the user instead.
- Sessions are deleted after the commit. If that step fails, the user stays signed in until banned again.
- The ban reason is staff-only. The banned user only ever sees the generic `BANNED_USER` message.
- Which reports a ban resolves is in [`moderation.md`](moderation.md).

### Unban

- `$unbanUser` calls the plugin's `auth.api.unbanUser` with the request headers.
- Its audit row ([`moderation.md`](moderation.md)) and then the `unbanned` event follow the plugin call.

### Set role

- Admins find the account on `/admin/accounts` through COSMO's user search. `$fetchRoleUser` maps the address to the user who linked it; an address nobody has linked has no role to change.
- `$setRole` locks the user row `FOR NO KEY UPDATE` and reads the current role. An unchanged role is a no-op.
- The role and a `user:set-role` audit row with `{ from, to }` commit together. `role-changed` is published after the commit.
- Open tabs keep the old role's UI until they reload, while the server already enforces the new role.

## User events

Changes that must end a user's chat streams are published as JSON on the Redis channel `user-events`. The channel name and the `UserEvent` union are in `@apollo/auth/events`; the subscriber side is drawn in [`apps/chat/README.md`](../apps/chat/README.md).

| Publisher (apps/web)                                                          | Event          | apps/chat                  |
| ----------------------------------------------------------------------------- | -------------- | -------------------------- |
| `databaseHooks.session.delete.after`, per deleted session that hadn't expired | `disconnect`   | ends the user's open calls |
| `deleteAccount()`                                                             | `disconnect`   | ends the user's open calls |
| `$banUser`                                                                    | `banned`       | ends the user's open calls |
| `$setRole`, when the role changed                                             | `role-changed` | ends the user's open calls |
| `$unbanUser`                                                                  | `unbanned`     | ignores it                 |

- Publish only after the change commits.
- The session hook covers sign-out, revoked sessions, password changes and a ban's `deleteUserSessions()`. A Redis failure there goes to Sentry rather than throwing, because the session is already gone.
- A user row's foreign key cascade deletes sessions without Better Auth's hooks seeing it. Code that deletes sessions that way publishes `disconnect` itself, as `deleteAccount()` does.
- If chat misses an event while it resubscribes, the chat token's lifetime bounds how long a stream outlives it.

## Chat tokens

apps/chat verifies short-lived JWTs from the `jwt` plugin. The chat side (verification, the session, ban and role read) is in [`apps/chat/README.md`](../apps/chat/README.md).

- The browser fetches a token from `GET /api/auth/token` with its session cookie. Public keys are served at `/api/auth/jwks`.
- Keys are Ed25519. The payload carries `sub` (user id) and `sid` (session id), never the role.
- `aud` is the origin of `VITE_CHAT_URL` (or `baseUrl()` when unset) and `iss` is `baseUrl()`.
- `expirationTime` is the duration string `` `${CHAT_TOKEN_LIFETIME_SECONDS}s` ``, because the plugin reads a number as an absolute `exp`.
- Private keys sit in the `jwks` table, encrypted under `BETTER_AUTH_SECRET`. Rotating the secret makes them undecryptable and `/token` fails, so clear the `jwks` rows when you rotate it.
- `/api/auth/token` responses carry `Cache-Control: no-store` (`routes/api/auth/$.ts`), so no cache between the browser and the server keeps a token.
- The chat origin isn't a trusted origin, because chat never calls Better Auth with cookies.

## Display currency

`user.currency` hints at the user's country, so only the signed-in user's own payload carries it ([`accounts.md`](accounts.md#public-users)).

- It is an `additionalField` with `input: true`, but only `$updateSettings` may write it. The supported-currency check is async, and Better Auth field validators must be synchronous.
- `input: false` would refuse the field from server calls too, so the `server-only-currency` plugin strips `currency` from router calls to `/update-user` and `/sign-up/email` instead.
- `$updateSettings` checks the code with `assertSupportedCurrency()`, then calls `auth.api.updateUser` with headers but no request, which the plugin lets through.

## API keys

Admins issue keys for the public API routes (`routes/api/user/*`, `routes/api/v1/user/search.ts`). The admin functions are in `lib/functions/api-keys.ts`, gated by `site: manage`.

- The plugin's HTTP routes are blocked in `hooks.before` ([Better Auth setup](#better-auth-setup)); leaving the client plugin out of `lib/client/auth.ts` protects nothing on its own.
- Create a key with `auth.api.createApiKey({ body: { userId, ... } })` and no headers. Headers switch the plugin to client mode, which ignores `userId`, and `hooks.before` would 404 the call anyway.
- List, update and delete keys with Drizzle on the `apikey` table, because the plugin's own endpoints are scoped to the caller's session. The owner column is `reference_id`.
- `rateLimit: { enabled: false }` is deliberate. The plugin's default of 10 verifications per day per key would break polling consumers.
- `enableSessionForAPIKeys` is off. `verifyRequestApiKey()` (`lib/server/api-key.server.ts`) returns a boolean, so a key carries no identity or permissions into the route.
- `verifyRequestApiKey()` reads `Authorization` (with an optional `Bearer` prefix) or `x-api-key`. It calls `auth.api.verifyApiKey`, a server-only endpoint with no HTTP path, so the route block doesn't affect it.

## Lock order

The lock order every multi-row write follows is in [`locking.md`](locking.md).

## Testing locally

- `turbo test --filter @apollo/auth` runs the role table and the guard tests.
- `bun run db:seed:staff` (apps/web) seeds an admin, a moderator, a member and two traders. Every password is `password` and every email is verified. Each run resets ban state.
- The seeded traders get COSMO links inserted directly, without `cosmo_link_audit` rows. There is no tester account.
- curl calls to `/api/auth/*` with a cookie jar must send `Origin` set to the origin of `VITE_BASE_URL`.

## Adding a role or permission

A new action:

1. Add it to `statement` in `packages/auth/src/index.ts` and grant it to roles.
2. Add a row to the hand-written table in `packages/auth/tests/roles.test.ts`.

A new role:

1. Add it to `roles`, `roleNames` and `roleRanks` (`src/guard.ts`). Keep each rank holding everything the ranks below it hold, because `isDemotion()` relies on it.
2. Add the value to the `user_role` enum in `packages/database/src/auth.ts` and generate a migration.
3. Add its label to `lib/client/roles.ts` in all six locales.
4. Add its column to the role table in `roles.test.ts`.
