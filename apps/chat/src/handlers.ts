import { can } from "@apollo/auth";
import {
  AlreadyReported,
  ChatNotFound,
  ChatUnavailable,
  Forbidden,
  MessageNotFound,
  RateLimited,
  ReportNotFound,
} from "@apollo/chat/errors";
import type { ChatItem, MessageSender } from "@apollo/chat/items";
import {
  canJoinChat,
  canRemoveMessage,
  canReportMessage,
  canSendChat,
  type ChatViewer,
} from "@apollo/chat/policy";
import { ChatRpcs, CurrentUser } from "@apollo/chat/protocol";
import { Duration, Effect, Option, Ref, Stream } from "effect";
import { RateLimiter } from "effect/persistence";
import { TradeChannels } from "./channels";
import { MessageCipher } from "./cipher";
import { OpenStreams } from "./open-streams";
import { ChatStore, type StoredRow, type StoredTrade } from "./store";

// rows read per query when a stream catches up
export const PAGE = 200;

const unavailable = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.mapError(effect, () => new ChatUnavailable());

function senderSide(trade: StoredTrade, senderId: string | null) {
  if (senderId === null) {
    return null;
  }
  if (senderId === trade.fromUserId) {
    return "from";
  }
  return senderId === trade.toUserId ? "to" : null;
}

// who a text row shows as sent by: staff by name, or a party by side
function messageSender(
  trade: StoredTrade,
  row: Extract<StoredRow, { kind: "text" }>,
): MessageSender | null {
  return row.staff === null
    ? senderSide(trade, row.senderId)
    : { _tag: "Staff", name: row.staff.name };
}

/**
 * Every ChatRpcs handler. Each runs behind ChatAuth, which provides
 * CurrentUser, and decides access through `@apollo/chat/policy` from what it
 * read itself, never from the payload.
 */
export const HandlersLive = ChatRpcs.toLayer(
  Effect.gen(function* () {
    const store = yield* ChatStore;
    const cipher = yield* MessageCipher;
    const channels = yield* TradeChannels;
    const openStreams = yield* OpenStreams;
    const limiter = yield* RateLimiter.RateLimiter;

    const consume = (key: string, limit: number, window: Duration.Input) =>
      limiter.consume({ key, limit, window, onExceeded: "fail" }).pipe(
        Effect.mapError((error) =>
          error.reason._tag === "RateLimitExceeded"
            ? new RateLimited({
                retryAfterMs: Duration.toMillis(error.reason.retryAfter),
              })
            : new ChatUnavailable(),
        ),
      );

    // staff writing from a report's page pass it, so their access names that report
    const readAccess = Effect.fn("chat/readAccess")(function* (
      viewer: ChatViewer,
      tradeId: string,
      reportId: string | null = null,
    ) {
      const trade = yield* unavailable(store.trade(tradeId));
      if (trade === null) {
        return yield* new ChatNotFound();
      }
      const openReport = yield* unavailable(
        store.openReport(tradeId, reportId),
      );
      const access = yield* canJoinChat(viewer, trade, openReport);
      return { trade, access };
    });

    /**
     * A body that won't decrypt is logged by id and shown like a blanked
     * one, and never ends the stream.
     */
    const toItem = (
      trade: StoredTrade,
      row: StoredRow,
    ): Effect.Effect<ChatItem> => {
      if (row.kind === "event") {
        return Effect.succeed({
          _tag: "Event",
          id: row.id,
          at: row.createdAt,
          event: row.event,
        });
      }
      const message = {
        _tag: "Message",
        id: row.id,
        sender: messageSender(trade, row),
        sentAt: row.createdAt,
        removed: row.removedAt !== null,
      } as const;
      if (row.body === null) {
        return Effect.succeed({ ...message, body: null });
      }
      return cipher.decrypt(trade.id, row.body).pipe(
        Effect.map((body) => ({ ...message, body })),
        Effect.catch(() =>
          Effect.logWarning("chat message unreadable").pipe(
            Effect.annotateLogs({ tradeId: trade.id, messageId: row.id }),
            Effect.as({ ...message, body: null }),
          ),
        ),
      );
    };

    return ChatRpcs.of({
      /**
       * Subscribes to the trade's signals before reading history, so nothing
       * committed after the read is missed, and says when that history is
       * all sent. Each signal then reads the trade's own rows past the last
       * id sent: an id is sent once, and only ever to a stream on its own
       * trade. Every page is read under its own access check, so staff lose
       * the chat when its last open report closes.
       */
      Join: ({ tradeId, afterId }) =>
        Stream.unwrap(
          Effect.gen(function* () {
            const viewer = yield* CurrentUser;
            yield* consume(`chat:join:${viewer.userId}`, 60, "1 minute");
            yield* openStreams.hold(viewer.userId);
            const { trade } = yield* readAccess(viewer, tradeId);

            const signals = yield* channels.subscribe(tradeId);
            const last = yield* Ref.make(afterId ?? 0);
            const recheck = readAccess(viewer, tradeId).pipe(
              Effect.map((current) => current.trade),
            );
            /**
             * The rows after `last`, oldest first, one page of PAGE rows per
             * pull from downstream. A page is read for the trade `checked`
             * yields: the first under the access check its caller made, each
             * later one under a new check. `last` moves to a page's newest id
             * before the page is emitted.
             */
            const readNew = (first: typeof recheck) =>
              Stream.paginate(first, (checked) =>
                Effect.gen(function* () {
                  const current = yield* checked;
                  const rows = yield* unavailable(
                    store.rowsAfter(current.id, yield* Ref.get(last), PAGE),
                  );
                  yield* Ref.update(last, (id) => rows.at(-1)?.id ?? id);
                  return [
                    yield* Effect.forEach(rows, (row) => toItem(current, row)),
                    rows.length < PAGE ? Option.none() : Option.some(recheck),
                  ] as const;
                }),
              );
            return readNew(Effect.succeed(trade)).pipe(
              Stream.concat(Stream.make({ _tag: "CaughtUp" } as const)),
              Stream.concat(
                Stream.fromSubscription(signals).pipe(
                  Stream.flatMap(() => readNew(recheck)),
                ),
              ),
            );
          }),
        ),

      Send: ({ tradeId, body, reportId }) =>
        Effect.gen(function* () {
          const viewer = yield* CurrentUser;
          const { trade, access } = yield* readAccess(
            viewer,
            tradeId,
            reportId,
          );
          const as = yield* canSendChat(viewer, access, trade);
          yield* consume(`chat:send:${viewer.userId}`, 10, "10 seconds");

          const messageId = yield* unavailable(
            store.insertMessage({
              tradeId,
              senderId: viewer.userId,
              as,
              // everyone in the trade but the sender: the other party, or both for staff
              recipientIds: [trade.fromUserId, trade.toUserId].flatMap((id) =>
                id === null || id === viewer.userId ? [] : [id],
              ),
              body: yield* cipher.encrypt(tradeId, body),
            }),
          );
          yield* channels.changed(tradeId);
          return { messageId };
        }),

      /**
       * The report keeps its own copy of the message's ciphertext, which
       * retention never blanks. Shares the web app's `report:<user>` budget.
       */
      Report: ({ messageId, reason, note }) =>
        Effect.gen(function* () {
          const viewer = yield* CurrentUser;
          yield* consume(`report:${viewer.userId}`, 5, "10 minutes");
          const row = yield* unavailable(store.row(messageId));
          if (row === null || row.kind === "event" || row.body === null) {
            return yield* new MessageNotFound();
          }
          const { trade, access } = yield* readAccess(viewer, row.tradeId).pipe(
            Effect.catchTags({
              ChatNotFound: () => new MessageNotFound(),
              StaffAccessRequired: () => new MessageNotFound(),
            }),
          );
          yield* canReportMessage(access, {
            sender: messageSender(trade, row),
          });

          const reportId = yield* unavailable(
            store.insertReport({
              reporterId: viewer.userId,
              reason,
              note: note ?? null,
              copy: {
                messageId,
                tradeId: row.tradeId,
                senderId: row.senderId,
                sentAt: row.createdAt,
                body: row.body,
              },
            }),
          );
          if (reportId === null) {
            return yield* new AlreadyReported();
          }
          return { reportId };
        }),

      Remove: ({ messageId, reportId }) =>
        Effect.gen(function* () {
          const viewer = yield* CurrentUser;
          const row = yield* unavailable(store.row(messageId));
          if (row === null || row.kind === "event") {
            return yield* new MessageNotFound();
          }
          const { access } = yield* readAccess(
            viewer,
            row.tradeId,
            reportId,
          ).pipe(Effect.catchTag("ChatNotFound", () => new MessageNotFound()));
          const accessReportId = yield* canRemoveMessage(viewer, access);
          yield* unavailable(
            store.removeMessage({
              messageId,
              tradeId: row.tradeId,
              staffId: viewer.userId,
              reportId: accessReportId,
            }),
          );
          yield* channels.changed(row.tradeId);
        }),

      /**
       * Staff who can read reports read a message report's copy, except one
       * about a message they sent.
       */
      ReportedMessage: ({ reportId }) =>
        Effect.gen(function* () {
          const viewer = yield* CurrentUser;
          if (!can(viewer.role, { report: ["read"] })) {
            return yield* new Forbidden();
          }
          const copy = yield* unavailable(store.reportCopy(reportId));
          if (copy === null || copy.senderId === viewer.userId) {
            return yield* new ReportNotFound();
          }
          const trade = yield* unavailable(store.trade(copy.tradeId));
          return {
            messageId: copy.messageId,
            tradeId: copy.tradeId,
            sender: trade === null ? null : senderSide(trade, copy.senderId),
            sentAt: copy.sentAt,
            body: yield* unavailable(cipher.decrypt(copy.tradeId, copy.body)),
          };
        }),
    });
  }),
);
