import { env } from "@/lib/env/server";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { baseUrl } from "@/lib/utils";
import { collections, objekts } from "@apollo/database/indexer/schema";
import {
  cosmoAccounts,
  tradeOfferItems,
  user,
} from "@apollo/database/web/schema";
import {
  type DisputeAlert,
  disputeWebhookRequest,
} from "@apollo/trades/disputes";
import { captureException } from "@sentry/bun";
import { asc, eq, inArray } from "drizzle-orm";
import { ofetch } from "ofetch";

/**
 * Post a newly opened dispute to the staff Discord channel, when
 * `DISCORD_DISPUTE_WEBHOOK_URL` is set. Call it after the dispute commits: a
 * failure is reported instead of thrown, because the dispute is already filed.
 */
export async function alertDispute(alert: DisputeAlert) {
  const webhookUrl = env.DISCORD_DISPUTE_WEBHOOK_URL;
  if (webhookUrl === undefined) return;

  await postDispute(webhookUrl, alert).catch(captureException);
}

async function postDispute(webhookUrl: string, alert: DisputeAlert) {
  const userIds = [alert.fromUserId, alert.toUserId].flatMap((id) =>
    id === null ? [] : [id],
  );
  const [parties, items] = await Promise.all([
    db
      .select({
        id: user.id,
        username: user.displayUsername,
        cosmoUsername: cosmoAccounts.username,
      })
      .from(user)
      .leftJoin(cosmoAccounts, eq(cosmoAccounts.userId, user.id))
      .where(inArray(user.id, userIds)),
    db
      .select({
        sender: tradeOfferItems.sender,
        kind: tradeOfferItems.kind,
        tokenId: tradeOfferItems.tokenId,
        member: tradeOfferItems.member,
        season: tradeOfferItems.season,
        amount: tradeOfferItems.amount,
        currency: tradeOfferItems.currency,
        method: tradeOfferItems.method,
      })
      .from(tradeOfferItems)
      .where(eq(tradeOfferItems.offerId, alert.tradeId))
      .orderBy(asc(tradeOfferItems.id)),
  ]);

  // the indexer's ids are text; web stores them as integers
  const tokenIds = items.flatMap((item) =>
    item.tokenId === null ? [] : [String(item.tokenId)],
  );
  const tokens =
    tokenIds.length === 0
      ? []
      : await indexer
          .select({
            id: objekts.id,
            serial: objekts.serial,
            collectionNo: collections.collectionNo,
          })
          .from(objekts)
          .innerJoin(collections, eq(objekts.collectionId, collections.id))
          .where(inArray(objekts.id, tokenIds));

  const party = (userId: string | null) =>
    parties.find((row) => row.id === userId) ?? null;
  const request = disputeWebhookRequest(webhookUrl, baseUrl(), alert, {
    parties: { from: party(alert.fromUserId), to: party(alert.toUserId) },
    items,
    tokens: new Map(tokens.map((token) => [Number(token.id), token])),
  });
  await ofetch(request.url, {
    method: "POST",
    timeout: 5000,
    body: request.body,
  });
}
