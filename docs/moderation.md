# Moderation

Reports, the staff tools under `/admin` and the staff audit log. Roles, permissions and where they are checked are in [`auth.md`](auth.md). How staff settle a disputed trade is in [`trades/lifecycle.md`](trades/lifecycle.md).

## Reports

One `reports` table holds every report. `target_type` says what was reported, and `target_id` is a plain text id with no foreign key.

| Target     | Filed by                                                                                        | `target_id`           | Reasons                                             |
| ---------- | ----------------------------------------------------------------------------------------------- | --------------------- | --------------------------------------------------- |
| `user`     | `$createReport` from a profile                                                                  | the user's id         | `reportReasons`                                     |
| `feedback` | `$createReport` from a rating                                                                   | the rating's id       | `feedbackReportReasons`                             |
| `message`  | chat's `Report` RPC                                                                             | the chat message's id | `messageReportReasons`                              |
| `trade`    | a dispute: a party (`$openDispute`), a ban (`party_banned`) or trade-timers (`deadline_passed`) | the trade's id        | `disputeReasons`, `party_banned`, `deadline_passed` |

- The reason lists are in `@apollo/database/web/types`. `reason` is a `varchar` typed by `StoredReportReason`, so a new reason needs no migration, only a label in `apps/web/src/lib/client/reports.ts`.
- `report_target_type` and `report_status` are Postgres enums, so a new target or status needs a migration ([`migrations.md`](migrations.md)).
- `createReportSchema` has no `message` or `trade` variant, because chat files message reports and a trade report is always a dispute.
- `$createReport` refuses `report_self` for the user's own profile or a rating they left. A removed rating answers `feedback_not_found`, so a report can't probe for one.
- Web and chat reports share one rate-limit bucket, `report:<user>` ([`tooling.md`](tooling.md#rate-limits)).
- A reporter holds at most one open or escalated report per target (`reports_open_reporter_target_idx`). `$createReport` relies on the index through `onConflictDoNothing`, whose `where` must repeat the index predicate verbatim, and answers `report_already_open`.
- A reporter is never told the outcome. Only a dispute's parties hear back, through the trade's timeline and notifications.
- Reports are never deleted. A deleted reporter or resolver leaves a null column, and a deleted target shows as gone on the report page.

### Lifecycle

```
  open ---- $escalateReport (from open only) ----> escalated
    |                                                  |
    +--------------- a closing path, below ------------+
                             |
                    +--------+--------+
                    v                 v
                resolved          dismissed        both final
```

| Closing path                                                | Report                  | Result                                                        |
| ----------------------------------------------------------- | ----------------------- | ------------------------------------------------------------- |
| `$resolveReport`, `$dismissReport`                          | user, message, feedback | that report; a trade report is refused `report_trade_dispute` |
| staff complete, cancel or extend the trade (`actOnTrade()`) | trade                   | every open report on the trade resolved                       |
| `$banUser` from the report page                             | user, message, feedback | every open report on that report's target resolved            |
| `$removeFeedback`                                           | feedback                | every open report on the rating resolved                      |
| chat `Remove`                                               | message                 | nothing; staff resolve the report afterwards                  |

- `resolved` and `dismissed` are final; nothing reopens a report. `reports_resolved_chk` ties `resolved_at` to those two statuses.
- `transitionReport()` (`lib/server/reports.server.ts`) guards on the current status, so a staff member who loses a race gets `report_status_changed` instead of overwriting the other's decision.
- A trade report closes only when staff settle the trade, because closing it as a report would leave the trade frozen ([`trades/lifecycle.md`](trades/lifecycle.md)). It can still be escalated.
- A ban resolves only the reports on the one target it was started from: the user, the one message or the one rating. Reports on the user's other messages or ratings stay open, and a ban started from `/admin/accounts` resolves nothing. The ban itself is in [`auth.md`](auth.md#ban).
- Every closing path writes one audit row per report it closes, in the same transaction.

### Hidden from the staff member they concern

`aboutStaff()` decides which reports a staff member may not see, whatever their role. Other staff handle those.

| Report     | Hidden when                                                                            |
| ---------- | -------------------------------------------------------------------------------------- |
| `user`     | it is about them                                                                       |
| `trade`    | they are a party by user id, or the trade is pinned to the COSMO address they link now |
| `message`  | the message is in such a trade, whoever sent it                                        |
| `feedback` | the rating is in such a trade, whoever left it                                         |

- The filter applies to the counts, the queue, the detail, and to resolve, dismiss and escalate.
- A hidden id answers `report_about_you` when the report is about the caller, else `report_not_found`.
- The address check covers a staff member who deleted their account and relinked the same COSMO account, because trades and ratings keep their pinned addresses.
- Staff can't act on their own trades or ratings either: `actOnTrade()` and `$removeFeedback` refuse `trade_own`.
- Chat's `ReportedMessage` refuses only the copy of a message the caller sent. The web hides the whole report first, so the report page never asks for the rest.

### Disputes

A trade report is the trade's dispute. `dispute_report_id` on the trade points at it while the trade is `disputed`; how staff settle it is in [`trades/lifecycle.md`](trades/lifecycle.md).

- A party's dispute names the party as reporter. A ban names the admin and files a `party_banned` dispute on each of the user's accepted trades. A `deadline_passed` dispute names the side that sent everything it owed, or nobody when both sent part.
- The report page offers the dispute actions only while the report is still the trade's dispute (`current`) and the trade is `disputed`. Any other open trade report on the same trade offers none, and closes with the trade.

### Message reports

Message reports are created only through chat. The flow is drawn in [`apps/chat/README.md`](../apps/chat/README.md#report-and-review).

- Chat stores the report and its evidence copy in one transaction. `report_messages` holds the same ciphertext as the message, keyed by report id.
- The copy has no foreign key to the message, trade or sender, so it outlives staff removal, chat retention and account deletion.
- The web app never reads message text. The report page fetches the decrypted copy from chat's `ReportedMessage` (`report: read`).
- An open message report also lets staff join that trade's chat ([`apps/chat/README.md`](../apps/chat/README.md#who-may-do-what)).

### Feedback reports

- Any signed-in user except the rating's author can report a rating, including the rated party.
- From the report, staff with `feedback: remove-any` remove the rating (`$removeFeedback`, `lib/functions/feedback.ts`). Removal stamps `removed_at` and takes a scored rating back out of the stats ([`trades/feedback.md`](trades/feedback.md)).
- `$removeFeedback` has its own staff rate limit, `feedback-remove:<staff>` ([`tooling.md`](tooling.md#rate-limits)).
- The report page shows the rating whether or not it has been removed.

## The report page

`/admin/reports` (`report: read`) is a queue on the left and the selected report's detail on the right.

- Status tabs show open and escalated counts, and the Type filter narrows both the queue and the counts.
- The sidebar badge counts `open` reports only. Escalated reports show on their own tab.
- Opening a report writes a `report:read` audit row. `reportDetailQuery()` never refetches on focus, so a visit logs once.
- The detail shows how many other open reports share the target, since each reporter files their own.
- A reported user shows their role, ban state, live trade count and `protected` flag. Only viewers who can ban see `protected` ([`auth.md`](auth.md#protected-accounts)).

What each role sees in the action bar (`components/admin/reports/report-actions.tsx`):

| Action                       | Shown when                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| Ban (user, sender or author) | `user: ban`, the target isn't the viewer, isn't banned and isn't protected                   |
| Escalate                     | `report: escalate` without `user: ban`, on an open report; admins ban instead                |
| Resolve, Dismiss             | `report: resolve`, on an open or escalated report that isn't a trade report                  |
| Complete, Cancel, Extend     | a current dispute; see [`trades/lifecycle.md`](trades/lifecycle.md)                          |
| Remove message               | `trade: remove-message`, on an open or escalated message report whose message is still there |
| Remove rating                | `feedback: remove-any`, on an open or escalated feedback report whose rating is still there  |

## Admin tools

The `/admin` shell opens for `report: read`, so moderators reach the report queue. Each page has its own `requirePermission()` guard, and each server function its own `staffMiddleware()` gate ([`auth.md`](auth.md#where-permissions-are-checked)). `/admin` itself redirects to `/admin/events` for `site: manage`, else to `/admin/reports`.

| Page                 | Permission                           | What it does                                                                                            | Server functions                                  |
| -------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `/admin/reports`     | `report: read`                       | the report queue and actions, above                                                                     | `reports.ts`, `staff-users.ts`, `staff-trades.ts` |
| `/admin/audit`       | `audit: read`                        | the staff audit log, filtered by staff member and action                                                | `staff-audit.ts`                                  |
| `/admin/accounts`    | `user: set-role` or `cosmo: history` | the role card ([`auth.md`](auth.md#set-role)) and the COSMO link history ([`accounts.md`](accounts.md)) | `staff-users.ts`, `cosmo-link-history.ts`         |
| `/admin/api-keys`    | `site: manage`                       | issue, rename, disable and delete API keys ([`auth.md`](auth.md#api-keys))                              | `api-keys.ts`                                     |
| `/admin/collections` | `site: manage`                       | edit a collection, refetch its metadata from COSMO, re-mirror its images, upload front media            | `collections.ts`                                  |
| `/admin/serials`     | `site: manage`                       | confirm an objekt's real serial ([`cosmo.md`](cosmo.md))                                                | `serials.ts`                                      |
| `/admin/events`      | `site: manage`                       | events and the collections in them                                                                      | `events.ts`                                       |
| `/admin/eras`        | `site: manage`                       | eras, with a Spotify album and an image                                                                 | `events.ts`                                       |
| `/admin/bands`       | `site: manage`                       | set `band_image_url` on collections in bulk, by slug                                                    | `bands.ts`                                        |
| `/admin/cache`       | `site: manage`                       | clear the artists, filter-data or one user's pins cache; set the COSMO key                              | `cache.ts`                                        |
| `/admin/notice`      | `site: manage`                       | set or clear the site-wide navbar notice                                                                | `notice.ts`                                       |

Server function files are in `apps/web/src/lib/functions`. Gotchas per tool:

- **Collections**
  - Edits write the indexer's `collection` row directly. Which columns the processor rewrites on the next transfer, and which stick, is in [`apps/indexer/CLAUDE.md`](../apps/indexer/CLAUDE.md#writes-and-the-store).
  - Refetch only fills the form from COSMO's v3 metadata. Nothing is saved until staff submit it.
  - Re-mirror rewrites every image file in R2, so it also repairs a partial mirror ([`packages/image/README.md`](../packages/image/README.md)).
- **Serials**: a confirmation writes only `serial_confirmation`. apps/schedules applies it within five minutes, and deleting a confirmation leaves the objekt's serial as it is until the next recompute ([`cosmo.md`](cosmo.md)).
- **Events**: adding collections to an event needs a COSMO link on the staff account, because `collection_data.contributor` stores their address. Editing a collection's description from the objekt page (`$updateCollectionMetadata`) needs one too.
- **Cache**: the COSMO key is the key COSMO's token refresh and profile reads need. A key set here overrides `COSMO_KEY` for apps/web and apps/schedules, with no expiry ([`packages/cosmo/README.md`](../packages/cosmo/README.md#credentials)).
- **Notice**: the notice is the Redis key `notice`, read by anyone through `$getNotice`. Saving an empty message deletes it.
- **API keys**: the owner is picked from linked COSMO accounts. The full key is shown once, on create.

## Staff audit log

`staff_audit` is an append-only record of staff reads and actions. Nothing updates or deletes its rows.

- `staff_id` has no foreign key, so rows outlive a deleted staff account. The log's Staff filter keeps demoted and deleted staff for the same reason.
- `report_id` names the report an action was taken from, when there was one.
- `action` and `target_type` are `varchar` columns typed by `staffAuditActions` and `staffAuditTargetTypes`, so a new action needs no migration.

### Writers

| Writer                                                              | Actions                                                                                                                                    |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| apps/web, `recordStaffAudit()` (`lib/server/staff-audit.server.ts`) | `report:*`, `user:*`, `api-key:*`, `metadata:update`, `trade:dispute`, `trade:complete`, `trade:cancel`, `trade:extend`, `feedback:remove` |
| apps/chat, `ChatStore` (`apps/chat/src/store.ts`)                   | `trade:message`, `trade:remove-message`                                                                                                    |

- Write the row with the `tx` of the change it records, so both commit or neither does.
- Two writes can't share a transaction, because a Better Auth plugin call commits first: `user:unban` and `api-key:create` are written with `db` after the call. A failure in between leaves the change unaudited.
- `report:read` records a read, not a change. It is written with `db` and deduplicated per staff member and report for 10 minutes, because SSR, hydration and invalidation would otherwise log one visit several times.
- apps/chat inserts its rows directly and must set `detail: { kind: "message", tradeId }`, because `toAuditTarget()` throws on a `message` row without it.
- Not audited: queue reads, staff trade page reads, staff chat joins, chat `ReportedMessage` reads, and the content tools (collections, serials, events, eras, bands, cache, notice).

### Adding an action

1. Add the action to `staffAuditActions` in `packages/database/src/web/types.ts`, plus a `StaffAuditDetail` variant if it carries detail.
2. Add its entry type to `UndeduplicatedAuditEntry` and a case to `toAuditRow()` (`lib/server/staff-audit.server.ts`).
3. For a new target type, add it to `staffAuditTargetTypes` and handle it in `toAuditTarget()`, `AdminAuditTarget` (`lib/universal/staff-audit.ts`) and `audit-row.tsx`.
4. Give it a label in `lib/client/staff-audit.ts`, with the message in all six locales under `apps/web/messages`, and a tone in `actionTones` in `components/admin/audit/audit-row.tsx`.
5. Call `recordStaffAudit(tx, ...)` inside the change's transaction.

## Adding a report target

1. Add the target to `reportTargetTypes` with a migration for the `report_target_type` enum.
2. Add its reason list to `@apollo/database/web/types`, include it in `StoredReportReason` and label it in `lib/client/reports.ts`.
3. Give it a filing path: a `createReportSchema` variant with a target check in `$createReport`, or its own entry point.
4. Add its row and detail shapes to `AdminReportRowTarget` and `AdminReportDetailTarget`, then build them in `toRowTarget()` and `fetchDetailTarget()`. Add a case to `reportedUser()` if a ban from it bans someone.
5. Hide it from the staff it concerns in `aboutStaff()`.
6. Add it to `reportTargetTypeFilters` and render it in `components/admin/reports/report-target.tsx`.

## Testing locally

- `bun run db:seed:staff` (apps/web) seeds an admin, a moderator, a reportable member and two traders ([`auth.md`](auth.md#testing-locally)).
- `turbo test --filter chat` covers staff chat access, removal and their audit rows (`apps/chat/tests/staff.test.ts`). `turbo test --filter @apollo/chat` covers the access policy.
