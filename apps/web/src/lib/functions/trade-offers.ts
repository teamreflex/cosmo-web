import { db } from "@/lib/server/db";
import {
  authenticatedMiddleware,
  cosmoMiddleware,
} from "@/lib/server/middlewares";
import { publishTradeUpdates } from "@/lib/server/trade-events.server";
import { readIndexerTokens } from "@/lib/server/trades/holdings.server";
import { refusePoster } from "@/lib/server/trades/listings.server";
import {
  insertOffer,
  preflightOffer,
  readOfferSerials,
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
  refuseTrade,
  updateLockedTrade,
} from "@/lib/server/trades/trade.server";
import type { AuthErrorCode } from "@/lib/universal/errors/auth";
import { ExpectedError } from "@/lib/universal/errors/expected";
import {
  endOfferInputSchema,
  offerSerialsInputSchema,
  tradeIdInputSchema,
} from "@/lib/universal/schema/trades";
import type { OfferSerials } from "@/lib/universal/trades";
import { tradeOfferItems } from "@apollo/database/web/schema";
import type { TradeSide } from "@apollo/database/web/types";
import {
  counterOfferInputSchema,
  offerInputSchema,
} from "@apollo/trades/listing";
import { CLAIM_WINDOW } from "@apollo/trades/timers";
import { createServerFn } from "@tanstack/react-start";
import { eq, sql } from "drizzle-orm";

/**
 * The copy of each collection a Trade Matches offer to the partner would
 * trade (readOfferSerials). $sendOffer re-checks whatever changes after
 * this.
 */
export const $fetchOfferSerials = createServerFn({ method: "GET" })
  .validator(offerSerialsInputSchema)
  .middleware([cosmoMiddleware])
  .handler(({ data, context }): Promise<OfferSerials> =>
    readOfferSerials(
      { userId: context.session.user.id, address: context.cosmo.address },
      data.partnerId,
      data,
    ),
  );

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
 * Answer a pending offer the caller received with an offer of their own,
 * checked like a send but to someone already in the trade. The counter is a
 * new pending offer under the original, which ends as countered, and the
 * original's sender is notified. Returns the counter's id.
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
    // the counter goes to the trade's other party
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
      await endTrade(tx, trade, next, users, new Map());
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
 * Accept a pending offer the caller received, as a listing claim starts a
 * trade: it becomes accepted with the claim's 48-hour deadline, and both
 * sides' tokens become live. Refused when either side can no longer give
 * its tokens; only the caller's own are named. The sender is notified.
 */
export const $acceptOffer = createServerFn({ method: "POST" })
  .validator(tradeIdInputSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;
    const parties = await partyTrade(userId, data.tradeId);
    // read before the transaction, so it never holds a connection on the indexer
    const tokens = await readIndexerTokens(parties.tokenIds);

    await db.transaction(async (tx) => {
      // both users, then the offer
      const { users, trade, by } = await lockPartyTrade(
        tx,
        userId,
        data.tradeId,
        parties,
        "no key update",
      );
      const next = answerOffer(trade, { type: "accept", by });
      if (trade.fromUserId === null) refuseTrade("offer_unavailable");
      if (trade.toAddress === null) {
        throw new ExpectedError("cosmo_not_linked" satisfies AuthErrorCode);
      }

      // both parties still linked to the addresses the offer pinned, then each side's tokens, the caller's first
      const sent = (side: TradeSide) =>
        trade.items.flatMap((item) =>
          item.sender === side && item.tokenId !== null ? [item.tokenId] : [],
        );
      const { recipient: sender } = await recheckOffer(
        tx,
        { userId, address: trade.toAddress },
        users,
        {
          toUserId: trade.fromUserId,
          toAddress: trade.fromAddress,
          give: sent("to"),
          get: sent("from"),
          tokens,
        },
      );

      // the trade starts now, and the live-token index backs up the checks
      await updateLockedTrade(tx, trade, {
        status: next.status,
        acceptedAt: sql`now()`,
        deadlineAt: sql`now() + make_interval(secs => ${CLAIM_WINDOW / 1000})`,
      });
      await refuseLiveClash(
        tx
          .update(tradeOfferItems)
          .set({ live: true })
          .where(eq(tradeOfferItems.offerId, trade.id)),
        "offer_unavailable",
      );
      await insertTradeEvent(tx, trade.id, { type: "accepted" });
      await notifyUsers(tx, [sender], {
        type: "offer_accepted",
        offerId: trade.id,
        actorId: userId,
        tokenId: null,
      });
    });
    await publishTradeUpdates([data.tradeId]);
  });

/**
 * End a pending offer before it's accepted: its recipient declines it, which
 * tells the sender, or its sender withdraws it, which tells no one.
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

      await endTrade(tx, trade, next, users, new Map());
      if (data.action === "withdraw") {
        await insertTradeEvent(tx, trade.id, { type: "withdrawn", by: "from" });
        return;
      }
      await insertTradeEvent(tx, trade.id, { type: "declined", by: "to" });
      await notifyUsers(
        tx,
        users.filter((row) => row.id === trade.fromUserId),
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
