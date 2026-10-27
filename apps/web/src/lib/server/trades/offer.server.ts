import { can, marketAccess, parseRole } from "@apollo/auth";
import { isBanActive } from "@apollo/auth/guard";
import {
  cosmoAccounts,
  objektListEntries,
  objektLists,
  tradeOfferItems,
  tradeOffers,
  user,
} from "@apollo/database/web/schema";
import type { NewTradeOfferItem } from "@apollo/database/web/types";
import type { TradeWant } from "@apollo/trades/allocate";
import { firstRefusal, pickSerials } from "@apollo/trades/holdings";
import { OFFER_WINDOW } from "@apollo/trades/timers";
import { isEqual } from "@apollo/util";
import { and, eq, exists, inArray, isNotNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { AuthErrorCode } from "../../universal/errors/auth";
import { ExpectedError } from "../../universal/errors/expected";
import type { OfferSerials } from "../../universal/trades";
import { db, type WebTx } from "../db";
import { tradePair } from "../objekts/lists.server";
import {
  readCandidates,
  readIndexerTokens,
  readWebTokenFlags,
  type TokenHoldings,
  type TokenState,
  unusableTokens,
} from "./holdings.server";
import type { ListingActor } from "./listings.server";
import {
  insertTradeEvent,
  type LockedUser,
  readLockedLinks,
  refuseToken,
  refuseTrade,
} from "./trade.server";

/**
 * An offer or counter from the actor, as its preflight checked it: who it
 * goes to, the address their link had then, and the indexer's state of
 * every token on both sides.
 */
type OfferPreflight = {
  toUserId: string;
  toAddress: string;
  give: readonly number[];
  get: readonly number[];
  tokens: ReadonlyMap<number, TokenState>;
};

/**
 * The checks a send or a counter runs without a lock, from its sender's
 * side: not to themselves, a counterparty with market access and a COSMO
 * link and, for a send, a discoverable have list paired with a discoverable
 * want list (the people Trade Matches shows), then who holds every token.
 * The sender's own token is named with why; a token on the counterparty's
 * side is named as unavailable, never why.
 */
export async function preflightOffer(
  actor: ListingActor,
  offer: Omit<OfferPreflight, "toAddress" | "tokens">,
  kind: "send" | "counter",
): Promise<OfferPreflight> {
  if (offer.toUserId === actor.userId) refuseTrade("offer_own");

  // the counterparty's link and role, and for a send their trade pair, in one statement
  const h = alias(objektLists, "h");
  const w = alias(objektLists, "w");
  const [link] = await db
    .select({ address: cosmoAccounts.address, role: user.role })
    .from(cosmoAccounts)
    .innerJoin(user, eq(user.id, cosmoAccounts.userId))
    .where(
      and(
        eq(cosmoAccounts.userId, offer.toUserId),
        kind === "send"
          ? exists(
              db
                .select({ id: h.id })
                .from(h)
                .innerJoin(w, tradePair(h, w))
                .where(eq(h.userId, cosmoAccounts.userId)),
            )
          : undefined,
      ),
    );
  // without market access they couldn't open the offer to answer it
  if (!link || !can(parseRole(link.role), marketAccess)) {
    refuseTrade("offer_unavailable");
  }

  // ownership on the indexer; locks and live trades are read under the lock
  const tokens = await readIndexerTokens([...offer.give, ...offer.get]);
  const unflagged = {
    states: tokens,
    locked: new Set(),
    live: new Set(),
  } satisfies TokenHoldings;
  const mine = firstRefusal(offer.give, unflagged, actor.address);
  if (mine) refuseToken(mine);
  const theirs = firstRefusal(offer.get, unflagged, link.address);
  if (theirs) {
    // names the other party's copy but never why, so the page can drop it
    throw new ExpectedError("offer_unavailable", { tokenId: theirs.tokenId });
  }
  return { ...offer, toAddress: link.address, tokens };
}

/**
 * Re-judges an offer under its parties' locks, once the caller has refused
 * an actor who is gone or banned: the actor still linked to the address
 * they're held to (their session's for a send or a counter, the offer's
 * pinned one for an accept), the counterparty unbanned and still linked to
 * the address the preflight judged or the offer pinned, then the locks and
 * live trades on each side's tokens, the actor's first. Returns both links
 * as the lock read them, which an offer pins, and the counterparty's locked
 * row.
 */
export async function recheckOffer(
  tx: WebTx,
  actor: ListingActor,
  users: readonly LockedUser[],
  preflight: OfferPreflight,
) {
  const links = await readLockedLinks(tx, [actor.userId, preflight.toUserId]);
  // the sender as their session was checked
  const fromAddress = links.get(actor.userId)?.address;
  if (fromAddress === undefined || !isEqual(fromAddress, actor.address)) {
    throw new ExpectedError("cosmo_not_linked" satisfies AuthErrorCode);
  }
  // the counterparty as the preflight judged them
  const recipient = users.find((row) => row.id === preflight.toUserId);
  const toAddress = links.get(preflight.toUserId)?.address;
  if (
    !recipient ||
    isBanActive(recipient) ||
    toAddress === undefined ||
    !isEqual(toAddress, preflight.toAddress)
  ) {
    refuseTrade("offer_unavailable");
  }

  // each side's locks and live trades, under the lock
  const mine = firstRefusal(
    preflight.give,
    {
      states: preflight.tokens,
      ...(await readWebTokenFlags(tx, fromAddress, preflight.give)),
    },
    fromAddress,
  );
  if (mine) refuseToken(mine);
  const theirs = firstRefusal(
    preflight.get,
    {
      states: preflight.tokens,
      ...(await readWebTokenFlags(tx, toAddress, preflight.get)),
    },
    toAddress,
  );
  if (theirs) {
    throw new ExpectedError("offer_unavailable", { tokenId: theirs.tokenId });
  }
  return { fromAddress, toAddress, recipient };
}

/**
 * Creates a pending offer the actor proposes as its `from` side, under
 * `parentId` when it counters one, with both addresses pinned and its 72
 * hours counted on the database's clock. `give` is sent by `from` and `get`
 * by `to`, and none of it is live until the offer is accepted. Starts its
 * timeline and returns its id.
 */
export async function insertOffer(
  tx: WebTx,
  actor: ListingActor,
  preflight: OfferPreflight,
  { fromAddress, toAddress }: Awaited<ReturnType<typeof recheckOffer>>,
  parentId: string | null,
) {
  const [offer] = await tx
    .insert(tradeOffers)
    .values({
      kind: "trade",
      status: "pending",
      fromUserId: actor.userId,
      toUserId: preflight.toUserId,
      fromAddress,
      toAddress,
      parentId,
      proposedBy: "from",
      expiresAt: sql`now() + make_interval(secs => ${OFFER_WINDOW / 1000})`,
    })
    .returning({ id: tradeOffers.id });
  if (!offer) throw new Error("Offer insert returned no row");

  // nothing is reserved until the offer is accepted
  await tx.insert(tradeOfferItems).values(
    (
      [
        ["from", preflight.give],
        ["to", preflight.get],
      ] as const
    ).flatMap(([sender, tokenIds]) =>
      tokenIds.flatMap((tokenId) => {
        const state = preflight.tokens.get(tokenId);
        return state?.kind === "found"
          ? [
              {
                offerId: offer.id,
                sender,
                kind: "objekt",
                tokenId,
                ...state.attributes,
              } satisfies NewTradeOfferItem,
            ]
          : [];
      }),
    ),
  );
  await insertTradeEvent(tx, offer.id, { type: "offered" });
  return offer.id;
}

/**
 * The copy of each collection a direct offer between the caller and the
 * partner would trade: the caller's for `give`, the partner's for `get`. A
 * token one of their have lists names comes first (the caller's lists in a
 * trade pair, the partner's discoverable ones), else the highest-serial
 * copy they could offer. A collection without one, or every `get` when the
 * partner has no COSMO link, is null. Sending re-checks whatever changes
 * after this.
 */
export async function readOfferSerials(
  caller: ListingActor,
  partnerId: string,
  slugs: { give: readonly string[]; get: readonly string[] },
): Promise<OfferSerials> {
  /**
   * The tokens each side's have lists name, oldest entry first: the
   * caller's lists in a trade pair and the partner's discoverable ones.
   * Read from the two users' lists, so the plan can walk each list's
   * entries by its id rather than a collection's across everyone's lists.
   */
  const h = alias(objektLists, "h");
  const w = alias(objektLists, "w");
  const named = db
    .select({
      userId: h.userId,
      slug: objektListEntries.collectionId,
      tokenId: objektListEntries.tokenId,
      createdAt: objektListEntries.createdAt,
    })
    .from(h)
    .innerJoin(w, tradePair(h, w, false))
    .innerJoin(objektListEntries, eq(objektListEntries.objektListId, h.id))
    .where(
      and(
        isNotNull(objektListEntries.tokenId),
        or(
          and(
            eq(h.userId, caller.userId),
            inArray(objektListEntries.collectionId, [...slugs.give]),
          ),
          and(
            eq(h.userId, partnerId),
            tradePair(h, w),
            inArray(objektListEntries.collectionId, [...slugs.get]),
          ),
        ),
      ),
    )
    .as("named");
  // joined onto the caller's own row, so the partner's link comes back without any named token
  const rows = await db
    .select({
      partnerAddress: cosmoAccounts.address,
      userId: named.userId,
      slug: named.slug,
      tokenId: named.tokenId,
    })
    .from(user)
    .leftJoin(cosmoAccounts, eq(cosmoAccounts.userId, partnerId))
    .leftJoin(named, sql`true`)
    .where(eq(user.id, caller.userId))
    .orderBy(named.createdAt);
  const partnerAddress = rows[0]?.partnerAddress ?? null;
  const namedBy = (owner: string) =>
    new Map(
      [
        ...Map.groupBy(
          rows.flatMap(({ userId, slug, tokenId }) =>
            userId === owner && slug !== null && tokenId !== null
              ? [{ slug, tokenId: Number(tokenId) }]
              : [],
          ),
          (entry) => entry.slug,
        ),
      ].map(([slug, entries]) => [slug, entries.map((entry) => entry.tokenId)]),
    );
  const mine = namedBy(caller.userId);
  const theirs = namedBy(partnerId);

  // who holds the named tokens
  const ids = [...mine.values(), ...theirs.values()].flat();
  const tokens = ids.length
    ? await readIndexerTokens(ids)
    : new Map<number, TokenState>();

  /**
   * One side's named token for each collection while it can still offer
   * it, else its highest-serial usable copy, which is read only for the
   * collections no named token covers.
   */
  const pick = async (
    address: string,
    side: readonly string[],
    sideNamed: ReadonlyMap<string, readonly number[]>,
  ) => {
    if (side.length === 0) return {};
    const exact = (some: readonly string[]) =>
      some.map((slug): TradeWant => ({ kind: "exact", slug, count: 1 }));
    const unusable = await unusableTokens(address, exact(side));
    const covered = pickSerials(
      side,
      sideNamed,
      tokens,
      address,
      unusable,
      new Map(),
    );
    const best = await readCandidates(
      address,
      exact(side.filter((slug) => covered[slug] === null)),
      1,
      unusable,
    );
    return pickSerials(
      side,
      sideNamed,
      tokens,
      address,
      unusable,
      new Map(
        best.map((copy) => [
          copy.attributes.slug,
          [{ tokenId: copy.tokenId, serial: copy.serial }],
        ]),
      ),
    );
  };
  return {
    give: await pick(caller.address, slugs.give, mine),
    get:
      partnerAddress === null
        ? Object.fromEntries(slugs.get.map((slug) => [slug, null]))
        : await pick(partnerAddress, slugs.get, theirs),
  };
}
