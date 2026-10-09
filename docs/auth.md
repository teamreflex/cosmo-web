# Auth — Better Auth

The web app uses Better Auth with Discord/Twitter OAuth. Config lives in `apps/web/src/lib/server/auth.server.ts`; the auth tables are hand-tuned in the drizzle schema files.

## Schema generation

`bunx @better-auth/cli generate` **clobbers** the hand-tuned auth schema (citext columns, custom indexes, the current relations API). When a plugin adds tables or columns: regenerate → `git restore` the schema file → transplant only the new tables and columns, re-adding FKs and `mode: "date"` timestamps by hand.

The admin plugin's columns are transplanted this way into `packages/database/src/auth.ts`: `user.role`, `banned`, `ban_reason`, `ban_expires` and `session.impersonated_by`. `role` is `NOT NULL DEFAULT 'user'` with the `user_role_chk` CHECK limiting it to `user`, `moderator` and `admin`, so rows inserted outside Better Auth still get a valid role and the comma-joined multi-role form is rejected. The column stays untyped `text` so `@apollo/database` doesn't depend on `@apollo/auth`.

`user.is_admin` is unused and is dropped in a follow-up release. Drizzle selects every column the TS schema declares on each session lookup, so remove `isAdmin` from the TS schema one release before the migration that drops the column; otherwise the image still serving during that deploy fails every authenticated request.

## Staff roles and permissions

- `@apollo/auth` (`packages/auth`) holds the access-control `statement`, the `user`, `moderator` and `admin` roles, `can(role, permissions)`, `parseRole()` and `adminPluginOptions`. The statement is declared `as const`, so a misspelt resource or action fails to compile. Moderators hold the trade, chat, listing, feedback and report actions; admins hold everything, adding `user: ["ban", "set-role"]`, `site: ["manage"]` and `audit: ["read"]`. Its bun test checks every role against every action through both `can()` and the plugin's `userHasPermission`.
- The server registers `admin(adminPluginOptions)`, and the test builds its throwaway instance from the same object. Never set `adminUserIds`: it bypasses every permission check.
- Impersonation and session management are absent from the statement, so no role can impersonate and `/admin/revoke-user-sessions` (which needs `session: ["revoke"]`) is refused for everyone. Banning already deletes the user's sessions.
- Better Auth types `user.role` as `string`. Narrow it with `parseRole()` wherever it arrives; missing, unknown and comma-joined values become `user`.
- Server functions gate staff work with `staffMiddleware(permissions)` from `lib/server/middlewares.ts`. It chains `authenticatedMiddleware`, throws `ExpectedError("forbidden")` when the role lacks a permission, and adds `role` to the context. Staff don't need a COSMO link; chain `cosmoMiddleware` after it only when the function writes the caller's COSMO address, as `$updateCollectionMetadata` does.
- The role reaches the client only on the current-account payload (`GetAccount.role`), never on `PublicUser`: `toPublicUser` also shapes other people's profiles, so a role there would publish staff status. `useCan()` (`hooks/use-can.ts`) reads it from `currentAccountQuery` and returns a `can` for the signed-in user. The `/admin` layout's `beforeLoad` returns `role` in the route context, and each admin page redirects to `/admin` when the role lacks the page's permission.
- Staff call the plugin's endpoints straight from the client (`authClient.admin.banUser`, `unbanUser`, `setRole`). The plugin checks the caller's role against `ac` on every call, so these need no server function.

## Staff hooks

- `hooks.after` in `auth.server.ts` handles `/admin/ban-user`, `/admin/unban-user` and `/admin/set-role`: it writes a `staff_audit` row with `recordStaffAudit()` (`lib/server/staff-audit.server.ts`), then publishes on the Redis `user-events` channel with `publishUserEvent()` (`lib/server/user-events.server.ts`). The channel name and the `UserEvent` union live in `@apollo/auth/events`, so subscribers share the contract. The audit row is written first, so a Redis failure surfaces as a 500 after the action has already committed.
- After-hooks run even when the endpoint threw, such as a moderator's refused ban, so return early when `isAPIError(ctx.context.returned)`. `ctx.body` is the raw request body, not the plugin's validated one, so zod-parse it. The acting staff member is `ctx.context.session`.
- `/admin/set-role` takes exactly one known role. The plugin would accept an array and comma-join it, which `user_role_chk` rejects, so `hooks.before` answers anything other than one of the three roles with a 400. The previous role is gone once the update commits, so the before-hook reads it and passes it to the after-hook in the `x-apollo-previous-role` request header, overwriting any value the client sent.
- A ban started from a report sends the report's id in an `x-report-id` header, through the `authClient.admin.banUser` call's fetch options. When the id names a report on the banned user, the after-hook links the `user:ban` audit row to it and resolves every open or escalated report on that user with `resolveUserReports()` (`lib/server/reports.server.ts`), which reuses the report actions' resolve transition and writes one `report:resolve` row per report, all in one transaction. Bans without the header leave reports untouched.
- `recordStaffAudit()` takes a `DbOrTx`, so a server function can write the audit row in the same transaction as the change it records. Report reads (`report:read`) are deduplicated per staff member and report for 10 minutes; actions never are.

## Protected accounts and self-demotion

- `PROTECTED_EMAIL_DOMAINS` is an optional server variable: a comma-separated list of email domains, trimmed and matched case-insensitively and exactly, so `team-reflex.com` matches neither `evil-team-reflex.com` nor `sub.team-reflex.com` unless that domain is listed too. The env schema parses it into a set with `parseEmailDomains()`; unset or empty protects nobody.
- Nobody, admins included, can ban, unban or change the role of an account whose email domain is listed. Nobody can lower their own role either; raising it or setting the same role is allowed.
- `hooks.before` enforces both on `/admin/ban-user`, `/admin/unban-user` and `/admin/set-role` through `guardUserChange()`, which applies `userChangeRefusal()` from `@apollo/auth/guard` (unit-tested in `packages/auth/tests/guard.test.ts`). These are the only plugin endpoints reachable under the statement that change an account's access or role; the others need permissions no role holds. Refusals are 403s with the `PROTECTED_USER` or `CANNOT_DEMOTE_SELF` code, which `getAuthErrorMessage` localises.
- The guard reads the caller's session itself and only runs for callers holding the endpoint's permission. Everyone else gets the plugin's own refusal, so nobody without the permission can probe which accounts are protected.
- The report detail's target carries a `protected` flag computed on the server, so the domain list never reaches the client. For a protected target the report detail hides Ban and Unban, and the action bar's heading says protected accounts can't be banned.

## Bans

- A ban deletes the user's sessions, and the plugin's `session.create.before` hook refuses new sign-ins with the `BANNED_USER` code, which `getAuthErrorMessage` localises. OAuth sign-ins by a banned user land on Better Auth's error page instead.
- The ban reason is staff-only. It is stored in `user.ban_reason` and the `user:ban` audit row's detail, and never reaches the banned user, who sees only the generic localised "This account has been banned" message. The Ban dialog's reason hint tells staff so.
- Ban lengths are lazy: `banned` stays true after `ban_expires` passes, until the next sign-in attempt clears it. Treat a ban as active only when `banned` is true and `ban_expires` is null or in the future. That automatic unban writes no audit row and publishes no event.
- A ban with no `banExpiresIn` (or zero) is permanent, but the plugin then leaves `ban_expires` untouched, so a lapsed earlier ban's expiry would lift it at the next sign-in. The ban after-hook clears `ban_expires` for permanent bans in the same transaction as the audit row, so the stored ban, the audit row and the published event agree.

## API Keys (admin-administered)

- The `@better-auth/api-key` **server plugin mounts `/api/auth/api-key/*` for all logged-in users** — the client plugin is only typed sugar, omitting it protects nothing, and there is no built-in role gate. `hooks.before` in `auth.server.ts` therefore 404s the HTTP routes: `ctx.path?.startsWith("/api-key/") && (ctx.request || ctx.headers)`. Optional chaining on `ctx.path` is required — server-only endpoints have no path.
- Admin operations run in server fns gated by `staffMiddleware({ site: ["manage"] })`: **create** via `auth.api.createApiKey({ body: { userId, ... } })` with NO `headers` (passing headers flips to client mode and ignores `userId`); **list/update/delete** via direct Drizzle on the `apikey` table (the plugin's own endpoints are session-self-scoped).
- Keep `@better-auth/api-key` in version lockstep with `better-auth`; both are pinned in the root catalog.
- `rateLimit: { enabled: false }` on the plugin is deliberate — the default (10 verifications/day per key) would silently break polling consumers of the public API routes.
- Public API routes authenticate via `verifyRequestApiKey` (`lib/server/api-key.server.ts`): reads `Authorization` (optional `Bearer` prefix) or `x-api-key`, then calls the server-only `auth.api.verifyApiKey` — which has no HTTP path, so it's unaffected by the route block.

## Testing

Better Auth refuses a POST that carries cookies unless its `Origin` header matches `trustedOrigins`, which holds only `baseUrl()` (from `VITE_BASE_URL`). curl calls to `/api/auth/*` with a cookie jar must send a matching `Origin` header: without one they fail with `MISSING_OR_NULL_ORIGIN`, and with another origin they fail with `INVALID_ORIGIN`.
