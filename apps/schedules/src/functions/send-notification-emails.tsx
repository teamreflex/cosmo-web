import { DatabaseIndexer } from "@/db-indexer";
import { Mailer } from "@/mailer";
import { isEmailable, planEmails } from "@/notification-emails";
import { collections, objekts } from "@apollo/database/indexer/schema";
import {
  cosmoAccounts,
  notifications,
  tradeOfferItems,
  tradeOffers,
  user,
} from "@apollo/database/web/schema";
import { NotificationEmail, notificationSubject } from "@apollo/mail";
import { DatabaseWeb } from "@apollo/services/database-web";
import { and, asc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Effect } from "effect";
import { Redis } from "effect/persistence";
import type { ScheduledTask } from "../task";

// how long after an email a user's new rows wait, so a burst rolls up into one
const COOLDOWN_SECONDS = 600;

function cooldownKey(userId: string) {
  return `notification-email-cooldown:${userId}`;
}

/**
 * Emails users about their notifications, treating the `notifications` table
 * as an outbox claimed by stamping `emailed_at`; the contract is in
 * docs/trades/notification-emails.md.
 */
export const sendNotificationEmailsTask = {
  name: "send-notification-emails",
  cron: "*/1 * * * *",
  effect: Effect.gen(function* () {
    const db = yield* DatabaseWeb;
    const indexer = yield* DatabaseIndexer;
    const redis = yield* Redis.Redis;
    const mailer = yield* Mailer;

    // the minute gives writers' transactions time to commit their whole burst
    const ready = and(
      isNull(notifications.emailedAt),
      lt(notifications.createdAt, sql`now() - interval '1 minute'`),
    );

    const pending = yield* db
      .selectDistinct({ userId: notifications.userId })
      .from(notifications)
      .where(ready);
    if (pending.length === 0) return;

    const cooling = yield* redis.send<(string | null)[]>(
      "MGET",
      ...pending.map((row) => cooldownKey(row.userId)),
    );
    const userIds = pending.flatMap((row, i) =>
      cooling[i] === null ? [row.userId] : [],
    );
    if (userIds.length === 0) return;

    /**
     * Commits on its own, so no SES call ever waits inside a transaction. It
     * skips rows another statement holds instead of waiting on them, so it
     * can't deadlock with `$markNotificationsRead` and an overlapping run
     * claims nothing twice; a skipped row is claimed by the next run.
     */
    const rows = yield* db
      .update(notifications)
      .set({ emailedAt: sql`now()` })
      .where(
        inArray(
          notifications.id,
          db
            .select({ id: notifications.id })
            .from(notifications)
            .where(and(ready, inArray(notifications.userId, userIds)))
            .for("no key update", { skipLocked: true }),
        ),
      )
      .returning({
        id: notifications.id,
        userId: notifications.userId,
        type: notifications.type,
        createdAt: notifications.createdAt,
        readAt: notifications.readAt,
        actorId: notifications.actorId,
        offerId: notifications.offerId,
      });

    // stamped rows are handled, so sending off still drains the outbox
    if (!mailer.enabled) return;

    const now = new Date();
    const emailable = rows.filter((row) => isEmailable(row, now));
    if (emailable.length === 0) return;

    const release = (ids: string[]) =>
      db
        .update(notifications)
        .set({ emailedAt: null })
        .where(inArray(notifications.id, ids));

    /**
     * A failed read would fail the run with every emailable row stamped, and
     * the retry's claim skips stamped rows, so they are released first.
     */
    const emails = yield* Effect.gen(function* () {
      const recipients = yield* db
        .select({
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          banned: user.banned,
          banExpires: user.banExpires,
          emailNotifications: user.emailNotifications,
        })
        .from(user)
        .where(inArray(user.id, [...new Set(emailable.map((r) => r.userId))]));

      const offerIds = [...new Set(emailable.flatMap((r) => r.offerId ?? []))];
      const fromAccount = alias(cosmoAccounts, "from_account");
      const toAccount = alias(cosmoAccounts, "to_account");
      const offers =
        offerIds.length === 0
          ? []
          : yield* db
              .select({
                id: tradeOffers.id,
                status: tradeOffers.status,
                fromUserId: tradeOffers.fromUserId,
                toUserId: tradeOffers.toUserId,
                deadlineAt: tradeOffers.deadlineAt,
                expiresAt: tradeOffers.expiresAt,
                fromName: fromAccount.username,
                toName: toAccount.username,
              })
              .from(tradeOffers)
              .leftJoin(
                fromAccount,
                eq(fromAccount.userId, tradeOffers.fromUserId),
              )
              .leftJoin(toAccount, eq(toAccount.userId, tradeOffers.toUserId))
              .where(inArray(tradeOffers.id, offerIds));

      // what each party sends, for the cards
      const items =
        offerIds.length === 0
          ? []
          : yield* db
              .select({
                offerId: tradeOfferItems.offerId,
                sender: tradeOfferItems.sender,
                kind: tradeOfferItems.kind,
                tokenId: tradeOfferItems.tokenId,
                amount: tradeOfferItems.amount,
                currency: tradeOfferItems.currency,
              })
              .from(tradeOfferItems)
              .where(inArray(tradeOfferItems.offerId, offerIds))
              .orderBy(asc(tradeOfferItems.id));

      // the indexer's ids are text; web stores them as integers
      const tokenIds = [
        ...new Set(
          items.flatMap((i) => (i.tokenId === null ? [] : [i.tokenId])),
        ),
      ];
      const tokens =
        tokenIds.length === 0
          ? []
          : yield* indexer
              .select({
                id: objekts.id,
                serial: objekts.serial,
                collection: {
                  slug: collections.slug,
                  member: collections.member,
                  collectionNo: collections.collectionNo,
                  frontImage: collections.frontImage,
                  frontImageVersion: collections.frontImageVersion,
                  backgroundColor: collections.backgroundColor,
                  textColor: collections.textColor,
                },
              })
              .from(objekts)
              .innerJoin(collections, eq(objekts.collectionId, collections.id))
              .where(inArray(objekts.id, tokenIds.map(String)));

      return planEmails({
        rows: emailable,
        recipients: new Map(recipients.map((r) => [r.id, r])),
        offers: new Map(offers.map((o) => [o.id, o])),
        items: Map.groupBy(items, (i) => i.offerId),
        objekts: new Map(tokens.map((t) => [Number(t.id), t])),
        now,
        appUrl: mailer.appUrl,
        cdnUrl: mailer.cdnUrl,
      });
    }).pipe(
      Effect.onError(() =>
        release(emailable.map((row) => row.id)).pipe(
          Effect.catch((error) =>
            Effect.logError(
              `Failed to release ${emailable.length} notifications after a failed read`,
              error,
            ),
          ),
        ),
      ),
    );

    /**
     * Each user's failures are caught and logged, because failing the run
     * would leave every later user's claimed rows stamped and unsent. A few
     * go at once, well under SES's per-second sending rate.
     */
    const sent = yield* Effect.forEach(
      emails,
      (email) =>
        mailer
          .send({
            to: email.to,
            subject: notificationSubject(email.items, mailer.config.appName),
            body: (
              <NotificationEmail
                config={mailer.config}
                items={email.items}
                manageUrl={mailer.appUrl("/account#notifications")}
              />
            ),
          })
          .pipe(
            Effect.andThen(
              redis.send(
                "SET",
                cooldownKey(email.userId),
                "1",
                "NX",
                "EX",
                String(COOLDOWN_SECONDS),
              ),
            ),
            Effect.as(true),
            Effect.catchTag("SendMailError", (error) =>
              Effect.gen(function* () {
                yield* Effect.logError(
                  `Failed to email ${email.userId}; releasing ${email.rowIds.length} notifications`,
                  error.cause,
                );
                yield* release(email.rowIds);
                return false;
              }),
            ),
            Effect.catch((error) =>
              Effect.logError(
                `Failed to finish the email to ${email.userId}`,
                error,
              ).pipe(Effect.as(false)),
            ),
          ),
      { concurrency: 5 },
    );

    yield* Effect.logInfo(
      `send-notification-emails claimed ${rows.length} notifications and sent ${sent.filter(Boolean).length} emails`,
    );
  }),
} satisfies ScheduledTask;
