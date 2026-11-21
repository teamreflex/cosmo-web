import { DatabaseIndexer } from "@/db-indexer";
import { collections, objekts } from "@apollo/database/indexer/schema";
import {
  cosmoAccounts,
  tradeOfferItems,
  user,
} from "@apollo/database/web/schema";
import { DatabaseWeb } from "@apollo/services/database-web";
import {
  type DisputeAlert,
  disputeWebhookRequest,
} from "@apollo/trades/disputes";
import { asc, eq, inArray } from "drizzle-orm";
import {
  Config,
  Context,
  Duration,
  Effect,
  Layer,
  Option,
  Redacted,
} from "effect";
import { FetchHttpClient, HttpBody, HttpClient } from "effect/http";

/**
 * Posts new disputes to the staff Discord channel. With
 * `DISCORD_DISPUTE_WEBHOOK_URL` unset it posts nothing and needs no other env;
 * with it set, `BASE_URL` is required for the links.
 */
export class Discord extends Context.Service<Discord>()("app/Discord", {
  make: Effect.gen(function* () {
    const webhook = yield* Config.option(
      Config.Redacted("DISCORD_DISPUTE_WEBHOOK_URL"),
    );
    if (Option.isNone(webhook)) {
      return { alertDispute: (_alert: DisputeAlert) => Effect.void };
    }

    const baseUrl = yield* Config.URL("BASE_URL");
    const client = (yield* HttpClient.HttpClient).pipe(
      HttpClient.filterStatusOk,
    );

    /**
     * Reads the dispute's parties and items, then posts it. Call it after the
     * dispute commits, never inside a web transaction. A failure is logged
     * instead of failing the task, and the log leaves out the error itself,
     * because an HTTP client error's request URL is the webhook's secret.
     */
    const alertDispute = (alert: DisputeAlert) =>
      Effect.gen(function* () {
        const db = yield* DatabaseWeb;
        const indexer = yield* DatabaseIndexer;
        const userIds = [alert.fromUserId, alert.toUserId].flatMap((id) =>
          id === null ? [] : [id],
        );
        const parties = yield* db
          .select({
            id: user.id,
            username: user.displayUsername,
            cosmoUsername: cosmoAccounts.username,
          })
          .from(user)
          .leftJoin(cosmoAccounts, eq(cosmoAccounts.userId, user.id))
          .where(inArray(user.id, userIds));
        const items = yield* db
          .select({
            id: tradeOfferItems.id,
            sender: tradeOfferItems.sender,
            kind: tradeOfferItems.kind,
            tokenId: tradeOfferItems.tokenId,
            member: tradeOfferItems.member,
            season: tradeOfferItems.season,
            amount: tradeOfferItems.amount,
            currency: tradeOfferItems.currency,
            method: tradeOfferItems.method,
            markedPaidAt: tradeOfferItems.markedPaidAt,
            confirmedAt: tradeOfferItems.confirmedAt,
          })
          .from(tradeOfferItems)
          .where(eq(tradeOfferItems.offerId, alert.tradeId))
          .orderBy(asc(tradeOfferItems.id));

        // the indexer's ids are text; web stores them as integers
        const tokenIds = items.flatMap((item) =>
          item.tokenId === null ? [] : [String(item.tokenId)],
        );
        const tokens =
          tokenIds.length === 0
            ? []
            : yield* indexer
                .select({
                  id: objekts.id,
                  serial: objekts.serial,
                  collectionNo: collections.collectionNo,
                })
                .from(objekts)
                .innerJoin(
                  collections,
                  eq(objekts.collectionId, collections.id),
                )
                .where(inArray(objekts.id, tokenIds));

        const party = (userId: string | null) =>
          parties.find((row) => row.id === userId) ?? null;
        const request = yield* Effect.try(() =>
          disputeWebhookRequest(
            Redacted.value(webhook.value),
            baseUrl.href,
            alert,
            {
              parties: {
                from: party(alert.fromUserId),
                to: party(alert.toUserId),
              },
              items,
              tokens: new Map(tokens.map((token) => [Number(token.id), token])),
            },
          ),
        );
        yield* client
          .post(request.url, { body: HttpBody.jsonUnsafe(request.body) })
          .pipe(Effect.timeout(Duration.seconds(5)));
      }).pipe(
        Effect.catch((error) =>
          Effect.logWarning(
            `Discord dispute alert for report ${alert.reportId} failed: ${error._tag}`,
          ),
        ),
      );

    return { alertDispute };
  }),
}) {
  static readonly layer = Layer.effect(this, this.make).pipe(
    Layer.provide(FetchHttpClient.layer),
  );
}
