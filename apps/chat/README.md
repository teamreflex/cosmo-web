# chat

Trade chat between the two parties of a trade, served over Effect RPC on a websocket. Staff can read a trade's chat while it has an open report or dispute. Message bodies are stored encrypted, and the web app's chat panel is the only client.

## A call

Every RPC call authenticates on its own with a short-lived token from the web app, then runs as that user until it ends, its token expires or the user is disconnected. For a `Join` the call is the whole stream.

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
    |                                  |  canSendChat: a party, trade live      |
    |                                  |  encrypt, insert the row and a         |
    |                                  |  notification for bob                  |
    |<--------- {messageId} -----------|  signal the trade                      |
    |                                  |    bob's Join wakes: re-check access,  |
    |                                  |    read rows after its last id,        |
    |                                  |    decrypt --------------------------->| new message
```

Trade events (accepted, items transferred, completed, a message removed) are rows in the same table, so they reach the stream the same way and in the same order.

## Redis

Chat runs as a single instance and fans out in process, so it publishes nothing. It listens for what the web app and schedules publish:

```
  web app, schedules                    Redis                          apps/chat
  ------------------------------        -----------------------        ------------------------------------
  trade changed (status, transfer) ---> trade-events  "updated" -----> signal the trade: open Joins
                                                                         read the new trade events
  session ended, account deleted   ---> user-events   "disconnect" --> end every open call of the user
  banned, role changed                                "banned"           with SessionEnded
                                                      "role-changed"
                                        (subscription lost) ---------> resubscribe after a second, then
                                                                         signal every open trade
```

Once a trade ends its chat is read-only, and schedules' `chat-retention` blanks its message bodies 14 days later. A report keeps its own encrypted copy of the reported message, which retention leaves alone.
