# Notification emails

`send-notification-emails` in apps/schedules reads the `notifications` table as an outbox and emails users about the trade and offer notifications that need them; which rows it mails is decided by `isEmailable()` and the pure `planEmails()` in `apps/schedules/src/notification-emails.ts`.

## Pipeline

```
  web notifyUsers(), schedules insertTradeNotifications(), chat trade_message
       |  insert notifications rows with emailed_at NULL; no writer knows about email
       v
  every minute: rows with emailed_at IS NULL and created_at < now() - 1 minute
       |
  1 ready users   SELECT DISTINCT user_id   (partial index notifications_email_pending_idx)
       |          minus users whose notification-email-cooldown:<userId> exists (one MGET)
       v
  2 claim         UPDATE ... SET emailed_at = now() WHERE id IN (... SKIP LOCKED) RETURNING
       |          one statement that commits on its own; every claimed row stays stamped
       |          NOTIFICATION_EMAILS off stops here
       |          isEmailable() keeps rows of a mailed type, unread and under 24 h old
       |          read their recipients and trades; a failed read releases those rows
       v
  3 planEmails()  drops a row about a trade that is gone, or whose recipient is unverified,
       |          banned or opted out
       |          -> one email per user
       v
  4 per user      Mailer.send() through @apollo/mail, aborted after 30 s
       +-- sent      SET notification-email-cooldown:<userId> 1 NX EX 600
       +-- refused   UPDATE ... SET emailed_at = NULL on that email's rows, logError, next user
```

## Outbox contract

- A row is handled once `emailed_at` is set, whether it was mailed or dropped. The claim has no time window, so rows written while the task was down are claimed on its next run.
- Bell-only, read and stale rows are claimed and stamped like the rest, so the partial index holds only rows still waiting.
- Rows older than the `emailed_at` column carry the migration's time in it, so the task never mails a backlog.
- The claim is one self-committing statement and the task opens no transaction, because the web client has one connection and an SES call inside a transaction would hold it ([apps/schedules/CLAUDE.md](../../apps/schedules/CLAUDE.md#one-connection-per-database)).
- The minute's wait lets a writer's transaction commit its whole burst, so the burst is claimed together.
- The claim locks its rows `FOR NO KEY UPDATE SKIP LOCKED` and never waits, so it can't deadlock with `$markNotificationsRead`, which updates the same user's rows in another order. A skipped row is claimed by the next run.
- Overlapping runs (two processes) send each row once: the second claim skips the rows the first holds, and finds them stamped once it commits. A retry by `createResilientTask()` finds the sent rows stamped.
- A failed read between the claim and the sends releases every row the run could mail before the run fails, because the retry's claim skips stamped rows.
- A refused send, or one SES doesn't answer within 30 s, releases only that email's rows and the run moves on, because failing the run would leave every later user's claimed rows stamped and unsent.
- A timed-out send that SES did deliver is mailed again on the next run, as a duplicate.
- Rows stay stamped and unsent only when the process dies between the claim and the send, or a release fails too, which is logged.
- `read_at` is judged at the claim. A row read in the bell after the claim is still mailed.

## Cooldown

- After a sent email, `notification-email-cooldown:<userId>` lives for 10 minutes. While it exists, step 1 skips the user, so their new rows wait and go out together as one email, at worst about 11 minutes after the first.
- It lives in Redis, not on `user`, because writing the user row takes `FOR NO KEY UPDATE` and would queue behind trade locks ([locking.md](../locking.md)).
- A refused send sets no cooldown, so the released rows go out on the next run.

## Who is mailed

- Only the types in `EMAIL_NOTIFICATION_BITS` (`packages/trades/src/notifications.ts`) are mailed. Every other type, the retired enum values included, stays bell-only, and a new notification type is bell-only until it gets a bit there.
- `user.email_notifications` is an opt-out mask: a set bit turns that type's email off, so the default 0 mails every type.
- `EMAIL_NOTIFICATION_BITS` pins each type's bit. Never reorder it, reuse a retired bit or derive bits from `notificationTypes` indexes, because a stored mask would silently change meaning.
- Categories exist only in the UI. Each switch on `/account#notifications` (`components/auth/account/notifications.tsx`) sets or clears its group of bits with `setCategoryEnabled()`, and shows on only while none of them is set, since a client can write any mask in bounds ([auth.md](../auth.md#client-written-user-fields)).
- Only `email_verified` recipients are mailed. The account page is the only place that asks a user to verify: until then the switches are disabled beside the verify button, or a note to add an email when `hasDeliverableEmail()` refuses the stored one.
- A recipient with an active ban (`isBanActive()`) is not mailed.
- `NOTIFICATION_EMAILS` ([env](../../apps/schedules/README.md#environment)) is the kill switch, read by `Mailer`. While it is false the task still claims and stamps rows but mails none, so turning it on never mails a backlog, and `Mailer` reads no mail env, so the process boots without it.

## The email

- `planEmails()` turns each row into a typed `NotificationItem` (`@apollo/mail`) carrying data, not copy: the other party, what the recipient gets and sends, and its type's facts (an offer's expiry, a send deadline, whether staff acted, a dispute's outcome). Each type's wording and the subject live in [`packages/mail`](../../packages/mail/README.md), as plain English strings, not Paraglide messages.
- The task reads each claimed trade's `trade_offer_items` and their objekts and collections from the indexer, so an item sums up both sides and shows their thumbnails; an objekt the indexer doesn't know is left out.
- The subject is the most urgent item's (`URGENCY`: a started 48 h send deadline first), with " (+N more)" when the email covers more rows; the same item's line is the inbox preview.
- Items are listed most urgent first, each with a button to `/trade/<id>`. The footer links to `/account#notifications`, the only opt-out, since the mail is transactional and carries no `List-Unsubscribe` header.
- Times are shown in UTC and say so, because users' timezones aren't stored.
- The other party is named as the bell names them: their COSMO username, shortened when it is an address (`accountName()` in `@apollo/util`), or "Deleted user". A null `actor_id` means staff acted, as the bell reads it.

## Testing locally

1. Run `turbo db:migrate --filter web` and `turbo db:seed:staff --filter web`, whose accounts all have verified emails.
2. Set `NOTIFICATION_EMAILS=true` in `.env.local`.
3. Make a notification in the app, such as an offer between the two seeded traders. To skip the minute's wait, run `UPDATE notifications SET created_at = now() - interval '2 minutes' WHERE emailed_at IS NULL` on the local web database.
4. Stop every other schedules copy, then run `bun run task send-notification-emails` in apps/schedules.
5. Read the email in mailpit at `localhost:8025`.

- The seeded accounts are verified, so their switches on `/account#notifications` work, and their `@seed.invalid` addresses still reach mailpit through floci.
- `docker compose exec valkey valkey-cli DEL notification-email-cooldown:<userId>` lets the next run mail the same user again.
- `docker compose stop floci` makes the send time out: after 30 s the rows are released and the error logged, and the next run with floci back sends them.
- Every email type can be previewed without sending: [`packages/mail`](../../packages/mail/README.md#previewing).
