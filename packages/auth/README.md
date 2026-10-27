# @apollo/auth

Staff roles, the account guards and the user-events contract, shared by apps/web, apps/chat and packages/chat. It is pure code with no I/O; its only dependency is Better Auth's access-control helpers.

| Import                | Holds                                                                                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@apollo/auth`        | the access-control `statement`, the four `roles`, `can()`, `parseRole()`, `marketAccess`, `adminPluginOptions` for the web app's admin plugin       |
| `@apollo/auth/guard`  | `isBanActive()`, `userChangeRefusal()` (ban, unban, set role), `cosmoLinkRefusal()`, protected-domain parsing and `protectionFor()`, `isDemotion()` |
| `@apollo/auth/events` | the `user-events` Redis channel name and the `UserEvent` union                                                                                      |

- What each role holds, where checks run and how to add a role or permission are in [`docs/auth.md`](../../docs/auth.md).
- How the guards are applied to bans, role changes and COSMO links is in [`docs/auth.md`](../../docs/auth.md#staff-changes-to-accounts) and [`docs/accounts.md`](../../docs/accounts.md#cosmo-links).
- apps/schedules doesn't depend on this package. It mirrors `isBanActive()` in SQL (`banActive` in `apps/schedules/src/trades.ts`), so a change to the ban rule changes both.

## Tests

`turbo test --filter @apollo/auth`

- `tests/roles.test.ts` checks every role against every action through both `can()` and a real admin-plugin instance. Its table is written by hand, so a change to a role's grants has to change the test too.
- `tests/guard.test.ts` covers the guards.
