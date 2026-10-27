import { db } from "@/lib/server/db";
import {
  authenticatedMiddleware,
  cosmoMiddleware,
} from "@/lib/server/middlewares";
import { publishTradeUpdates } from "@/lib/server/trade-events.server";
import {
  readListingTerms,
  recheckListingOffer,
} from "@/lib/server/trades/claim.server";
import { readIndexerTokens } from "@/lib/server/trades/holdings.server";
import {
  insertOffer,
  preflightOffer,
  recheckOffer,
} from "@/lib/server/trades/offer.server";
import {
  answerOffer,
  endTrade,
  insertTradeEvent,
  lockParties,
  lockPartyTrade,
  notifyUsers,
  partyTrade,
  refuseLiveClash,
  refusePoster,
  refuseTrade,
  updateLockedTrade,
} from "@/lib/server/trades/trade.server";
import type { AuthErrorCode } from "@/lib/universal/errors/auth";
import { ExpectedError } from "@/lib/universal/errors/expected";
import {
  endOfferInputSchema,
  tradeIdInputSchema,
} from "@/lib/universal/schema/trades";
import { tradeOfferItems } from "@apollo/database/web/schema";
import type { TradeSide } from "@apollo/database/web/types";
import { proposerId } from "@apollo/trades/lifecycle";
import {
  counterOfferInputSchema,
  offerInputSchema,
} from "@apollo/trades/listing";
import { CLAIM_WINDOW } from "@apollo/trades/timers";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, type SQL, sql } from "drizzle-orm";

/**
 * Send a direct offer from Trade Matches: the caller's `give` tokens for the
 * recipient's `get` tokens. It stays pending, reserving nothing, until the
 * recipient accepts, declines or counters it, the caller withdraws it, or
 * 72 hours pass. Only someone Trade Matches would show can receive one.
 * Every refusal is an ExpectedError and writes nothing.
 */
export const $sendOffer = createServerFn({ method: "POST" })
  .validator(offerInputSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    const actor = {
      userId: context.session.user.id,
      address: context.cosmo.address,
    };

    const preflight = await preflightOffer(actor, data, "send");
    const tradeId = await db.transaction(async (tx) => {
      // both users, so neither can relink or be banned before commit
      const users = await lockParties(
        tx,
        [actor.userId, data.toUserId],
        "no key update",
      );
      refusePoster(users.find((row) => row.id === actor.userId));
      const checked = await recheckOffer(tx, actor, users, preflight);
      const id = await insertOffer(tx, actor, preflight, checked, null);
      await notifyUsers(tx, [checked.recipient], {
        type: "offer_received",
        offerId: id,
        actorId: actor.userId,
        tokenId: null,
      });
      return id;
    });
    await publishTradeUpdates([tradeId]);
    return { tradeId };
  });

/**
 * Answer a pending offer the other party proposed with an offer of their own,
 * checked like a send but to someone already in the trade. The counter is a
 * new pending offer under the original, which ends as countered, and the
 * original's proposer, whom the counter goes to, is notified. Returns the
 * counter's id.
 */
export const $counterOffer = createServerFn({ method: "POST" })
  .validator(counterOfferInputSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    const actor = {
      userId: context.session.user.id,
      address: context.cosmo.address,
    };

    const parties = await partyTrade(actor.userId, data.tradeId);
    // an offer on a listing can't be countered (transition refuses it too), so no indexer work is spent on one
    if (parties.listingId !== null) refuseTrade("offer_unavailable");
    // the counter goes to the trade's other party, the proposer whenever the counter is allowed
    const toUserId =
      parties.fromUserId === actor.userId
        ? parties.toUserId
        : parties.fromUserId;
    if (toUserId === null) refuseTrade("offer_unavailable");
    const preflight = await preflightOffer(
      actor,
      { toUserId, give: data.give, get: data.get },
      "counter",
    );

    const counterId = await db.transaction(async (tx) => {
      // both users, then the offer being countered
      const { users, trade, by } = await lockPartyTrade(
        tx,
        actor.userId,
        data.tradeId,
        parties,
        "no key update",
      );
      const next = answerOffer(trade, { type: "counter", by });
      const checked = await recheckOffer(tx, actor, users, preflight);

      // the counter starts its own 72 hours, and the original ends pointing at it
      const id = await insertOffer(tx, actor, preflight, checked, trade.id);
      await endTrade(tx, trade, next, users);
      await insertTradeEvent(tx, trade.id, {
        type: "countered",
        counterId: id,
      });
      await notifyUsers(tx, [checked.recipient], {
        type: "offer_countered",
        offerId: id,
        actorId: actor.userId,
        tokenId: null,
      });
      return id;
    });
    await publishTradeUpdates([data.tradeId, counterId]);
    return { tradeId: counterId };
  });

/**
 * Accept a pending offer the other party proposed, as a listing claim starts a
 * trade: it becomes accepted with the claim's 48-hour deadline, and both
 * sides' tokens become live. Refused when either side can no longer give
 * its tokens, naming the token (and, for the caller's own, why). An offer
 * on the caller's listing is judged again as a claim would be against the
 * listing as it is now (recheckListingOffer). The proposer is notified.
 */
export const $acceptOffer = createServerFn({ method: "POST" })
  .validator(tradeIdInputSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;
    const parties = await partyTrade(userId, data.tradeId);
    // read before the transaction, so it never holds a connection on the indexer
    const [tokens, terms] = await Promise.all([
      readIndexerTokens(parties.tokenIds),
      parties.listingId === null ? null : readListingTerms(parties.listingId),
    ]);

    await db.transaction(async (tx) => {
      // both users, then the offer, then for an offer on a listing the listing
      const { users, trade, by } = await lockPartyTrade(
        tx,
        userId,
        data.tradeId,
        parties,
        "no key update",
      );
      const next = answerOffer(trade, { type: "accept", by });
      if (terms === null) {
        if (trade.fromUserId === null) refuseTrade("offer_unavailable");
        if (trade.toAddress === null) {
          throw new ExpectedError("cosmo_not_linked" satisfies AuthErrorCode);
        }

        // both parties still linked to the addresses the offer pinned, then each side's tokens, the caller's first
        const sent = (side: TradeSide) =>
          trade.items.flatMap((item) =>
            item.sender === side && item.tokenId !== null ? [item.tokenId] : [],
          );
        await recheckOffer(tx, { userId, address: trade.toAddress }, users, {
          toUserId: trade.fromUserId,
          toAddress: trade.fromAddress,
          give: sent("to"),
          get: sent("from"),
          tokens,
        });
      } else {
        await recheckListingOffer(tx, trade, users, terms, tokens);
      }

      // the trade starts now, and the live-token index backs up the checks
      await updateLockedTrade(tx, trade, {
        status: next.status,
        acceptedAt: sql`now()`,
        deadlineAt: sql`now() + make_interval(secs => ${CLAIM_WINDOW / 1000})`,
      });
      const goLive = (...where: SQL[]) =>
        tx
          .update(tradeOfferItems)
          .set({ live: true })
          .where(and(eq(tradeOfferItems.offerId, trade.id), ...where));
      if (terms === null) {
        await refuseLiveClash(goLive(), "offer_unavailable");
      } else {
        // an offer on a listing names the side that clashed: the poster's pick, or the claimer's tokens without saying why
        await refuseLiveClash(
          goLive(eq(tradeOfferItems.sender, "from")),
          "listing_pick_unavailable",
        );
        await refuseLiveClash(
          goLive(eq(tradeOfferItems.sender, "to")),
          "offer_unavailable",
        );
      }
      await insertTradeEvent(tx, trade.id, { type: "accepted" });
      await notifyUsers(
        tx,
        users.filter((row) => row.id === proposerId(trade)),
        {
          type: "offer_accepted",
          offerId: trade.id,
          actorId: userId,
          tokenId: null,
        },
      );
    });
    await publishTradeUpdates([data.tradeId]);
  });

/**
 * End a pending offer before it's accepted: the side that didn't propose it
 * declines it, which tells the proposer, or the proposer withdraws it,
 * which tells no one. The timeline names the side that acted.
 */
export const $endOffer = createServerFn({ method: "POST" })
  .validator(endOfferInputSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;
    const parties = await partyTrade(userId, data.tradeId);
    await db.transaction(async (tx) => {
      const { users, trade, by } = await lockPartyTrade(
        tx,
        userId,
        data.tradeId,
        parties,
      );
      const next = answerOffer(trade, { type: data.action, by });

      await endTrade(tx, trade, next, users);
      if (data.action === "withdraw") {
        await insertTradeEvent(tx, trade.id, { type: "withdrawn", by });
        return;
      }
      await insertTradeEvent(tx, trade.id, { type: "declined", by });
      await notifyUsers(
        tx,
        users.filter((row) => row.id === proposerId(trade)),
        {
          type: "offer_declined",
          offerId: trade.id,
          actorId: userId,
          tokenId: null,
        },
      );
    });
    await publishTradeUpdates([data.tradeId]);
  });
