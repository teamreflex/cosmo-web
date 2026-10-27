# @apollo/chat

The trade chat contract shared by [apps/chat](../../apps/chat/README.md) (the server) and the web app (the client): the RPC group, its errors, the wire schemas, the access policy and message sanitising.

## Protocol

Every RPC runs behind the `ChatAuth` middleware, so any call can also fail with `Unauthorized`, `TokenExpired`, `SessionEnded` or `ChatUnavailable`. The middleware is `requiredForClient`: the client supplies the half that attaches its token (`ChatAuthClient` in `apps/web/src/lib/client/chat.ts`).

| RPC               | Payload                        | Result                                                                | Errors                                                               |
| ----------------- | ------------------------------ | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `Join` (stream)   | `tradeId`, `afterId?`          | history as `Message` and `Event` items, `CaughtUp`, then live items   | `ChatNotFound`, `StaffAccessRequired`, `RateLimited`                 |
| `Send`            | `tradeId`, `body`, `reportId?` | `{ messageId }`                                                       | `ChatNotFound`, `StaffAccessRequired`, `ChatReadOnly`, `RateLimited` |
| `Report`          | `messageId`, `reason`, `note?` | `{ reportId }`                                                        | `MessageNotFound`, `Forbidden`, `AlreadyReported`, `RateLimited`     |
| `Remove`          | `messageId`, `reportId?`       | nothing                                                               | `MessageNotFound`, `Forbidden`, `StaffAccessRequired`                |
| `ReportedMessage` | `reportId`                     | the report's copy: `messageId`, `tradeId`, `sender`, `sentAt`, `body` | `Forbidden`, `ReportNotFound`                                        |

- Messages and events share one id space (`trade_messages.id`), which `afterId` pages through.
- `reportId` on `Send` and `Remove` is only a preference for which open report a staff action is audited under; it never widens access.
- Every error a client causes sets `ErrorReporter.ignore`; `ChatUnavailable` is the server's own failure and doesn't.

## Rules

- `src/policy.ts` is the only place chat access is decided. The server calls it with rows it read; the web app mirrors `canSendChat` only to hide the composer.
- `MessageBody` sanitises on decode, then checks 1 to `MAX_MESSAGE_LENGTH` characters, and is `Redacted` so logs and decode errors print `<redacted>`. The web composer runs the same `sanitizeMessage()` before sending.
- `sanitizeMessage()` strips bidi and control characters (except tab and newline), trims, and returns `""` when nothing visible remains, so invisible-only messages are refused.
- `KnownTradeEvent` in `src/items.ts` is a hand-kept mirror of `TradeEvent` in `packages/database/src/web/types.ts`. Add every new event kind to both, because nothing checks them and a missing kind decodes as the loose `{ type: string }` shape the client shows as unknown.
- A message's `sender` is `"from"`, `"to"`, or `Staff` with a name. It is null when a party's account is deleted, and a deleted staff account keeps `Staff` with a null name.

## Tests

`bun test` covers the policy (`tests/policy.test.ts`, across every trade status) and `MessageBody` and sanitising (`tests/body.test.ts`).
