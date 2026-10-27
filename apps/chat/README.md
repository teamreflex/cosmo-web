# chat

Trade chat between the two parties of a trade, served over Effect RPC on a websocket. Staff can read a trade's chat while it has an open report or dispute, and staff with `trade: ["message"]` can then write to both parties. Message bodies are stored encrypted, and the web app's chat panel is the only client.

Chat runs as a single instance: `Send` and `Remove` wake open streams in process, and Redis only carries what the web app and schedules publish.

The wire protocol, errors and access policy live in [`@apollo/chat`](../../packages/chat/README.md). Rules for changing this app are in [`CLAUDE.md`](CLAUDE.md).

## A call

Every RPC call authenticates on its own with a short-lived token from the web app, then runs as that user until it ends, its token expires or the user is disconnected. For a `Join` the call is the whole stream. The web side of the token is in [docs/auth.md](../../docs/auth.md).

```
  chat panel (browser)                                web app
  --------------------                                -------------------------------
  authClient.token()  ------ GET /api/auth/token ---> signs a JWT {sub, sid}
                      <------------ JWT ------------- (EdDSA, CHAT_TOKEN_LIFETIME_SECONDS)
         |
         | WebSocket /rpc
         | every call sends "authorization: Bearer <JWT>"
         v
  +--------------------------------- apps/chat ----------------------------------+
  |                                                                              |
  |  Origin check    the upgrade only: Origin must be in ALLOWED_ORIGINS, or 403 |
  |       |                                                                      |
  |       v                                                                      |
  |  ChatAuth        verify the JWT with AUTH_JWKS_URL <------ /api/auth/jwks    |
  |  (every call)    watch Disconnects for the user                              |
  |       |          read the session: live, the user's own, not impersonated,   |
  |       |          not banned  ->  CurrentUser {userId, sessionId, role}       |
  |       |          the call ends early at   token exp   ->  TokenExpired       |
  |       |                                   disconnect  ->  SessionEnded       |
  |       v                                                                      |
  |  handlers        Join, Send, Report, Remove, ReportedMessage                 |
  |       |          access from @apollo/chat/policy, on rows they read          |
  |       |          rate limits in Redis                                        |
  |       v                                                                      |
  |  MessageCipher   AES-256-GCM under MESSAGE_KEY, the trade id bound in        |
  |  ChatStore  ---> web Postgres: trade_messages, report_messages,              |
  |                  notifications, staff_audit                                  |
  +------------------------------------------------------------------------------+
```

How `ChatAuth` refuses a call:

| Error             | Cause                                                                                |
| ----------------- | ------------------------------------------------------------------------------------ |
| `Unauthorized`    | no bearer token, a forged or malformed token, an impersonated session, an active ban |
| `TokenExpired`    | the token reached its `exp`, before or during the call                               |
| `SessionEnded`    | the session is missing, expired or another user's, or the user was disconnected      |
| `ChatUnavailable` | the JWKS or the database couldn't be reached; never grants access                    |

## Client token and rejoin loop

The panel keeps a `Join` alive across token expiry, disconnects and dropped sockets by rejoining after the last item it saw (`conversationAtom` in `apps/web/src/lib/client/chat.ts`, `rejoinPlan()` in `chat-conversation.ts`).

```
  chat panel                                                 apps/chat
  ----------                                                 ---------
  currentToken: the cached JWT until 80% of its lifetime,
  else authClient.token() (a 401 there is Unauthorized)
        |
        v
  Join {tradeId, afterId: last id seen} -------------------> ChatAuth, then the stream
        |  <--------------- history, CaughtUp, live items --
        |
        |  the stream fails with ...
        |
        +-- Unauthorized, ChatNotFound, StaffAccessRequired --> the chat ends, no rejoin
        |
        +-- TokenExpired, SessionEnded --> drop the cached token
        |     first failure in a row:      rejoin at once, no banner
        |     a repeat:                    as below
        |
        +-- anything else ---------------> "reconnecting" banner, then wait
                                           RateLimited: retryAfterMs
                                           else 1 s, 2 s, 4 s .. 15 s

  a rejoin is a Join after the last id seen: no gap, no duplicate
  any item resets the count; 3 failures in a row show "unreachable" and Try again
```

## A message

A stream subscribes to its trade's signal before it reads any history, so nothing committed in between is missed.

```
  alice                            apps/chat                                  bob
    |                                  |                                        |
    |                                  |<------ Join {tradeId, afterId?} -------|
    |                                  |  canJoinChat: a party, or staff while  |
    |                                  |  the trade has an open report          |
    |                                  |  subscribe to the trade's signal       |
    |                                  |  read rows after afterId, decrypt ---->| history
    |                                  |  ----------------------------------->  | CaughtUp
    |                                  |                                        |
    |------ Send {tradeId, body} ----->|                                        |
    |                                  |  canSendChat: a party on a live trade, |
    |                                  |  or staff with trade:message           |
    |                                  |  encrypt, insert the row and a         |
    |                                  |  notification for bob                  |
    |<--------- {messageId} -----------|  signal the trade                      |
    |                                  |    bob's Join wakes: re-check access,  |
    |                                  |    read rows after its last id,        |
    |                                  |    decrypt ----------------------->| new message
```

- Trade events (accepted, items transferred, completed, a message removed) are rows in the same table and id space, so they reach the stream the same way and in the same order.
- Chat writes only the `message_removed` event; the web app and schedules write the rest in their own transactions.
- The trade page refetches the trade when a new event arrives in its chat, because the chat stream is the page's only live feed.

## Who may do what

Decided in `packages/chat/src/policy.ts`, from the trade and report rows the handler read; only `ReportedMessage` checks the role alone.

| Action            | A party                                                        | Staff who aren't a party                                                                                              |
| ----------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `Join`            | trade is accepted, disputed, completed, cancelled or timed out | `trade: ["read-any"]` and an open or escalated report on the trade or one of its messages, else `StaffAccessRequired` |
| `Send`            | trade is accepted or disputed, else `ChatReadOnly`             | `trade: ["message"]`, ended trades included, audited under the report                                                 |
| `Report`          | only the other party's messages                                | never (`Forbidden`)                                                                                                   |
| `Remove`          | never (`Forbidden`)                                            | `trade: ["remove-message"]`, audited under the report                                                                 |
| `ReportedMessage` | never (`Forbidden`)                                            | `report: ["read"]`; the copy of a message they sent themselves is `ReportNotFound`                                    |

- Anyone else, and any trade that isn't accepted or later, gets `ChatNotFound`, so a trade id can't be probed.
- A staff member who is a party to the trade is treated as a party.
- Parties are matched by user id, never by pinned address, so a deleted party's side matches no one.
- A staff `Join` re-checks access on every signal. Resolving or dismissing a report publishes no signal, so a staff stream ends at the next signal for the trade or at its token's `exp`.
- The report staff act under is the `reportId` a report page passes while it's open on the trade, else the trade's oldest open report.

## Report and review

Message reports are created only through chat's `Report`; the web app's report form has no message target. The report lifecycle itself is in [docs/moderation.md](../../docs/moderation.md).

```
  party                       apps/chat                           staff (report page)
    |-- Report {messageId} -->|                                            |
    |                         | rate limit report:<user>                   |
    |                         | canReportMessage: the other party's only   |
    |                         | one transaction: a reports row (message)   |
    |                         |   + report_messages, the same ciphertext   |
    |<----- {reportId} -------|   (AlreadyReported: reporter has one open) |
    |                         |<------- ReportedMessage {reportId} --------|
    |                         |-------- the copy, decrypted -------------->|
    |                         |<------- Join {tradeId} --------------------|
    |                         |<------- Remove {messageId, reportId} ------|
    |                         | blank the body, message_removed event,     |
    |                         | trade:remove-message audit, signal         |
```

## Life of a message body

```
                 Send                            Report (the other party)
                  |                                    |
                  v                                    v
   trade_messages.body = ciphertext ---copy---> report_messages.body (same bytes)
                  |                             kept until the report row is deleted,
        +---------+------------+                read through ReportedMessage
        |                      |
  staff Remove           CHAT_RETENTION_DAYS after the trade ends
  body = NULL            (schedules chat-retention, hourly)
  removed_at = now()     body = NULL, removed_at stays NULL
  + message_removed      no event, no signal
    event row
        |                      |
        v                      v
  removed: true          removed: false, body: null
```

- A body that won't decrypt is logged by trade and message id and shown like a blanked one; it never ends the stream.

## Redis

Chat subscribes to two channels; who publishes each user event is in [docs/auth.md](../../docs/auth.md).

```
  web app, schedules              Redis                          apps/chat
  ------------------              -----                          ---------
  a trade's rows changed  ----->  trade-events  "updated"  ----> signal the trade:
                                                                 open Joins re-read
  web app                 ----->  user-events   "disconnect" --> end every open call
                                                "banned"         of the user with
                                                "role-changed"   SessionEnded
                                                "unbanned"  ---> ignored
                                  (subscription lost) ---------> resubscribe after 1 s,
                                                                 signal every open trade
```

- Resignalling every open trade after a resubscribe means a Redis outage loses no message.
- A user event published while the subscription was down is lost; the token's lifetime bounds how long that user's calls stay open.
- Redis also backs the rate limiter's store.
