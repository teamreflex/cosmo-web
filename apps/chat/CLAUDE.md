# Chat App

Effect service serving the `ChatRpcs` group from `@apollo/chat/protocol` as a websocket at `/rpc`. [`README.md`](README.md) draws the call, rejoin, message, report and Redis flows; this file holds the rules for changing them.

## Access rules

- Decide access only through `@apollo/chat/policy`, from rows the handler read itself, never from the payload. `ChatStore` operations make no access decisions.
- Read role and ban state from the database on every call, never from the token, so a role change or ban applies before the token expires. The token carries only `sub` and `sid`.
- Take keys from `AUTH_JWKS_URL` only, never from the token's headers or issuer, because a token must not name the key that verifies it.
- `Report` maps `ChatNotFound` and `StaffAccessRequired` to `MessageNotFound`, and `Remove` maps `ChatNotFound`, because "doesn't exist" and "not yours" must look the same.

## Ordering and delivery rules

- `ChatAuth` subscribes to the user's `Disconnects` before it reads the session, so a disconnect published during the read still ends the call.
- `Join` subscribes to the trade's signal before it reads history, so a row committed in between is still delivered.
- Signals carry no data: a woken stream re-reads its own trade's rows past its last id, so a dropped, coalesced or misdirected signal can't lose or leak a message.
- Every writer of `trade_messages` holds the trade row `FOR NO KEY UPDATE` before inserting, because `Join` reads by `id > last` and ids must commit in order. `Send` first locks the sender and recipients `FOR KEY SHARE` in id order, for the notifications' foreign keys; the full order is in [docs/locking.md](../../docs/locking.md).
- A write that open streams must see calls `channels.changed(tradeId)` after its transaction. Chat runs as one instance and fans out in process; a second instance would need a Redis publish for `Send` and `Remove`.
- Change `tests/memory-store.ts` with every change to `src/store.ts`.
- New timeline event kinds go in `KnownTradeEvent` too; see [packages/chat](../../packages/chat/README.md).

## Message body rules

- Message text never leaves `MessageBody` (`Redacted`) except into `MessageCipher`: never log it, and log only ids around it.
- `ChatStore` failures log only the error's `name` and become an empty `StoreError`, because Drizzle error messages include statement parameters (ciphertext).
- Ciphertext is bound to its trade id as AES-GCM additional data, and a report copy is the same bytes. Never move or re-parent a body between trades.
- `MESSAGE_KEY` can't be rotated: a changed or lost key makes every stored message and report copy unreadable.

## Send: one transaction

```
  Send {tradeId, body, reportId?}
    |
    v
  readAccess -> canSendChat -> rate limit chat:send:<user> -> encrypt (trade id as AAD)
    |
  +-- ChatStore.insertMessage, one transaction ------------------------------+
  | 1. lock user rows (sender + recipients) FOR KEY SHARE, ordered by id     |
  | 2. lock the trade row FOR NO KEY UPDATE                                  |
  | 3. insert the trade_messages text row, by_staff when sent as staff       |
  | 4. per recipient still present: a trade_message notification, unless     |
  |    one from this sender for the trade is still unread                    |
  | 5. staff only: staff_audit trade:message under the access's report       |
  +--------------------------------------------------------------------------+
    |
    v
  channels.changed(tradeId) -> every open Join of the trade re-reads past its last id
```

- Recipients are the trade's parties except the sender, so a staff message notifies both.
- `Remove` locks only the trade row, blanks the body, sets `removed_at`, and adds a `message_removed` event and a `trade:remove-message` audit row. Removing a removed message does nothing.

## Rate limits

Keyed per user in Redis, inline in `src/handlers.ts`.

| RPC                         | Key                | Limit         | Consumed                                                            |
| --------------------------- | ------------------ | ------------- | ------------------------------------------------------------------- |
| `Join`                      | `chat:join:<user>` | 60 per minute | before any lookup                                                   |
| `Send`                      | `chat:send:<user>` | 10 per 10 s   | after the policy check, so refused sends cost nothing               |
| `Report`                    | `report:<user>`    | 5 per 10 min  | before any lookup; the same budget as the web app's `$createReport` |
| `Remove`, `ReportedMessage` | none               |               |                                                                     |

## Where to start

| Change                       | Files                                                                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A new RPC or error           | `packages/chat/src/protocol.ts` and `errors.ts`, then `src/handlers.ts`, `src/store.ts` with `tests/memory-store.ts`, and the client in `apps/web/src/lib/client/chat.ts` |
| Who may do what              | `packages/chat/src/policy.ts` and its tests, then the `canSend` mirror in `apps/web/src/components/trades/chat/chat-panel.tsx`                                            |
| Message length or sanitising | `MAX_MESSAGE_LENGTH` and `sanitize.ts` in `packages/chat`, shared by the server decode and the composer                                                                   |
| The retention window         | `CHAT_RETENTION_DAYS` in `packages/trades/src/timers.ts`, which also sets the feedback window                                                                             |

## Tests

`bun test` runs in memory: `tests/memory-store.ts` is a Map-backed `ChatStore`, and `tests/harness.ts` signs tokens with a local EdDSA key, uses a random message key, a memory rate limiter and the `TestClock`. It seeds alice, bob, carol and dave, a moderator and an admin, and one trade between alice and bob. Nothing opens a database or Redis.

| Suite                  | Proves                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| `canary.test.ts`       | a body appears only in the streams and replies that asked for it, never in logs, rows, notifications or reports |
| `join.test.ts`         | history then `CaughtUp`, rejoin by `afterId` without gaps, `TokenExpired` at `exp`, disconnects                 |
| `messages.test.ts`     | ciphertext only, AAD binding, isolation between trades, the send limit, report refusals                         |
| `staff.test.ts`        | staff access through reports, audit under the right report, `Remove`, staff messages                            |
| `tokens.test.ts`       | forged, expired, banned and impersonated tokens; the role comes from the database                               |
| `redis-events.test.ts` | trade updates signal, user events end calls                                                                     |
| `socket.test.ts`       | the real routes on a random port and the real clock: the Origin check, and dates and error tags crossing JSON   |

`RpcTest` skips the socket and JSON, which is why `socket.test.ts` exists.

## Running locally

`bun run dev` serves on :3001 with the root `.env` and `.env.local`. `DEV_CHAT=true` (with `DEV_SERVICES=true`) runs it in Docker with the other dev services instead, reaching the host's JWKS through `host.docker.internal`.

| Variable                                | Must be                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------- |
| `MESSAGE_KEY`                           | `openssl rand -base64 32`; anything but 32 bytes stops the process at boot                  |
| `AUTH_JWKS_URL`                         | the web app's `/api/auth/jwks`                                                              |
| `AUTH_ISSUER`                           | the web app's base URL                                                                      |
| `AUTH_AUDIENCE`                         | the origin of the web app's `VITE_CHAT_URL` (`ws://localhost:3001`)                         |
| `ALLOWED_ORIGINS`                       | the web app's origins, comma-separated; a request without an `Origin` header is refused too |
| `WEB_DATABASE_URL`, `REDIS_URL`, `PORT` | the shared web database, Redis, and the port                                                |

- Set the web app's `VITE_CHAT_URL` to `ws://localhost:3001`; with it unset the web app shows no chat.
- `CHAT_TOKEN_LIFETIME_SECONDS=60` on the web app makes token expiry and rejoins quick to see.
- A mismatched issuer or audience makes every call `Unauthorized`.
