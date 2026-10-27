import { tradeOfferItems, tradeOffers } from "@apollo/database/web/schema";
import type {
  NewTradeOfferItem,
  TradeOfferStatus,
} from "@apollo/database/web/types";
import { scaleWants, unitsOf } from "@apollo/trades/allocate";
import { validateAssignment } from "@apollo/trades/assignment";
import { claimCap } from "@apollo/trades/caps";
import { firstRefusal } from "@apollo/trades/holdings";
import {
  listingUnitSize,
  takesOffers,
  tradeListings,
} from "@apollo/trades/lifecycle";
import type { ClaimListingInput } from "@apollo/trades/listing";
import { CLAIM_WINDOW, OFFER_WINDOW } from "@apollo/trades/timers";
import { isEqual } from "@apollo/util";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type * as z from "zod";
import type { AuthErrorCode } from "../../universal/errors/auth";
import { ExpectedError } from "../../universal/errors/expected";
import type {
  ListingPickRefusal,
  TradeErrorCode,
} from "../../universal/errors/trades";
import {
  offerRefusal,
  offerRefusalError,
  storedObjektItemSchema,
  type StoredWant,
  storedWantSchema,
  tradeWants,
} from "../../universal/trade-listings";
import { db, type DbOrTx, type WebTx } from "../db";
import { claimStanding } from "./detail.server";
import { storedWants } from "./feed.server";
import {
  readIndexerTokens,
  readSharedTokenFlags,
  readWebTokenFlags,
  type TokenState,
} from "./holdings.server";
import type { ListingActor } from "./listings.server";
import { posterBlocked, posterLinkColumns } from "./poster.server";
import {
  claimerLink,
  insertTradeEvent,
  type LockedTrade,
  type LockedUser,
  lockParties,
  notifyUsers,
  readLockedLinks,
  refuseLiveClash,
  refuseToken,
} from "./trade.server";

function refuse(code: TradeErrorCode | AuthErrorCode): never {
  throw new ExpectedError(code);
}

/**
 * Refuses a claim or an offer on a listing when the poster's picked objekts
 * include one they can't give right now, naming it, so the picker can drop
 * it.
 */
function refusePick(tokenId: number): never {
  throw new ExpectedError("listing_pick_unavailable", {
    tokenId,
  } satisfies ListingPickRefusal);
}

/**
 * Why a listing can't be claimed on the terms the claimer saw, judged on
 * its status first: a closed listing says so even when the claimer's view
 * is also stale.
 */
function statusRefusal(
  listing: { status: TradeOfferStatus; updatedAt: Date } | undefined,
  seen: Date,
): TradeErrorCode | null {
  if (!listing) return "listing_not_found";
  if (listing.status !== "open") return "listing_closed";
  return listing.updatedAt.getTime() === seen.getTime()
    ? null
    : "listing_updated";
}

function listingStatus(executor: DbOrTx, id: string) {
  return executor
    .select({ status: tradeOffers.status, updatedAt: tradeOffers.updatedAt })
    .from(tradeOffers)
    .where(eq(tradeOffers.id, id));
}

type Preflight = {
  listing: {
    id: string;
    fromUserId: string | null;
    fromAddress: string;
    picked: z.output<typeof storedObjektItemSchema>[];
    wants: StoredWant[];
  };
  // the indexer's state of the picks and the claimer's tokens
  states: ReadonlyMap<number, TokenState>;
  submitted: number[];
  // the listing takes offers, so this sends one rather than claiming
  offer: boolean;
};

/**
 * The checks that need no lock, in claim precedence: the listing, its
 * status and the claimer's view of it, the poster's account, the poster's
 * objekts the claim picked, then the claimer's tokens. The picks must be
 * `units` units of the pool, each one the poster can give now. Assignment
 * is checked against the want rows scaled to the units, on every submitted
 * token's indexer values whoever owns it, so a misfit row is refused the
 * same way however the tokens are held. A listing with a range row takes
 * offers (takesOffers), decided from its rows as read here, which the
 * lock's `updated_at` guard holds to; sending one runs these same checks.
 */
export async function preflightClaim(
  actor: ListingActor,
  input: ClaimListingInput,
): Promise<Preflight> {
  const row = await db.query.tradeOffers.findFirst({
    where: { id: input.listingId, kind: "listing" },
    columns: {
      id: true,
      status: true,
      fromUserId: true,
      fromAddress: true,
      unitSize: true,
      updatedAt: true,
    },
    with: {
      items: { where: { leftAt: { isNull: true } }, orderBy: { id: "asc" } },
      wants: storedWants,
      fromUser: {
        columns: { banned: true, banExpires: true },
        with: { cosmoAccount: posterLinkColumns },
      },
    },
  });
  if (!row) refuse("listing_not_found");
  if (
    row.fromUserId === actor.userId ||
    isEqual(row.fromAddress, actor.address)
  ) {
    refuse("listing_own");
  }
  const stale = statusRefusal(row, input.seen);
  if (stale) refuse(stale);
  const unitSize = listingUnitSize(row);

  const wants = row.wants.map((want) => storedWantSchema.parse(want));
  // a commit since the status read is the better answer to a refused pick
  const refuseAfterRecheck = async (refusal: () => never) => {
    const [now] = await listingStatus(db, row.id);
    const changed = statusRefusal(now, input.seen);
    if (changed) refuse(changed);
    refusal();
  };
  if (posterBlocked(wants, row.fromUser, row.fromAddress)) {
    await refuseAfterRecheck(() => refuse("listing_unavailable"));
  }

  const pool = new Map(
    row.items.map((item) => {
      const parsed = storedObjektItemSchema.parse(item);
      return [parsed.tokenId, parsed];
    }),
  );
  const picked = input.picked.flatMap((tokenId) => pool.get(tokenId) ?? []);
  if (
    picked.length !== input.picked.length ||
    unitsOf(picked.length, unitSize) !== input.units
  ) {
    refuse("claim_assignment_invalid");
  }

  // both sides' tokens in one indexer read, beside the poster's flags
  const submitted = input.rows.flat();
  const [states, pickedFlags] = await Promise.all([
    readIndexerTokens([...input.picked, ...submitted]),
    readWebTokenFlags(db, row.fromAddress, input.picked),
  ]);
  const unavailable = firstRefusal(
    input.picked,
    { states, ...pickedFlags },
    row.fromAddress,
  );
  if (unavailable) {
    await refuseAfterRecheck(() => refusePick(unavailable.tokenId));
  }

  const claimerStates = submitted.flatMap(
    (tokenId) => states.get(tokenId) ?? [],
  );
  const missing = claimerStates.find((state) => state.kind === "missing");
  if (missing) {
    refuseToken({ tokenId: missing.tokenId, reason: "not_owned" });
  }
  const found = claimerStates.flatMap((state) =>
    state.kind === "found" ? [state] : [],
  );
  // posterBlocked has refused payment rows, so every want is an objekt row
  const assignment = validateAssignment(
    scaleWants(tradeWants(wants), input.units),
    input.rows,
    new Map(found.map((state) => [state.tokenId, state.attributes])),
  );
  if (!assignment.ok) refuse("claim_assignment_invalid");

  // locks and live trades are read under the lock, after the account checks
  const unflagged = firstRefusal(
    submitted,
    { states, locked: new Set(), live: new Set() },
    actor.address,
  );
  if (unflagged) refuseToken(unflagged);
  return {
    listing: {
      id: row.id,
      fromUserId: row.fromUserId,
      fromAddress: row.fromAddress,
      picked,
      wants,
    },
    states,
    submitted,
    offer: takesOffers(wants),
  };
}

/**
 * Locks both users' rows in one statement ordered by id, so a claim or an
 * offer on the listing can't deadlock against a crossed one or interleave
 * with a deletion or ban, and the claimer's parallel claims queue for the
 * cap, which their linked address's feedback score sets, and reads their
 * COSMO links under the locks. Then locks the listing row behind its status
 * and `updated_at` guard without changing it, so claims and offers on one
 * listing queue behind each other and an edit or a drop: one that committed
 * while this one waited leaves no row to lock, and the re-read says which.
 * A claim racing a trade from another listing for the same token is caught
 * by the live-token index on insert. Then repeats every check that could
 * have changed, refusing a claimer who already has a live claim or a
 * pending offer from the listing; only a claim counts against the cap,
 * since an offer is checked against it when it's accepted. A refusal rolls
 * the write back. Returns the claimer's COSMO address as stored, which the
 * trade pins, and the poster's locked row, missing when the listing has no
 * poster.
 */
export async function lockAndRecheck(
  tx: WebTx,
  actor: ListingActor,
  input: ClaimListingInput,
  { listing, states, submitted, offer }: Preflight,
) {
  const users = await lockParties(
    tx,
    [actor.userId, listing.fromUserId],
    "no key update",
  );
  const links = await readLockedLinks(tx, [actor.userId, listing.fromUserId]);
  const claimer = users.find((row) => row.id === actor.userId);
  if (!claimer) refuse("not_signed_in");
  const poster = users.find((row) => row.id === listing.fromUserId);

  const [locked] = await tx
    .select({ id: tradeOffers.id })
    .from(tradeOffers)
    .where(
      and(
        eq(tradeOffers.id, listing.id),
        eq(tradeOffers.status, "open"),
        eq(tradeOffers.updatedAt, input.seen),
      ),
    )
    .for("no key update");
  if (!locked) {
    const [row] = await listingStatus(tx, listing.id);
    refuse(statusRefusal(row, input.seen) ?? "listing_updated");
  }

  // the poster's account, ban and link as the lock read them, then the picks
  if (
    posterBlocked(
      listing.wants,
      poster === undefined
        ? null
        : { ...poster, cosmoAccount: links.get(poster.id) ?? null },
      listing.fromAddress,
    )
  ) {
    refuse("listing_unavailable");
  }
  const picks = listing.picked.map(({ tokenId }) => tokenId);
  // both sides' locks and live trades, judged on the indexer states read before
  const flagsFor = await readSharedTokenFlags(
    tx,
    [...picks, ...submitted],
    [listing.fromAddress, actor.address],
  );
  const unavailable = firstRefusal(
    picks,
    { states, ...flagsFor(listing.fromAddress) },
    listing.fromAddress,
  );
  if (unavailable) refusePick(unavailable.tokenId);

  const link = claimerLink(
    claimer,
    links.get(actor.userId)?.address,
    actor.address,
  );
  if (link.kind === "refused") refuse(link.refusal);
  const standing = await claimStanding(tx, actor.userId, listing.id);
  if (standing.claimsListing) refuse("listing_claim_exists");
  if (!offer && standing.active >= claimCap(standing)) {
    refuse("claim_cap_reached");
  }

  const token = firstRefusal(
    submitted,
    { states, ...flagsFor(actor.address) },
    actor.address,
  );
  if (token) refuseToken(token);
  return { toAddress: link.address, poster };
}

/**
 * Creates the claim's trade with both addresses pinned and copies the
 * poster's picked objekts and the claimer's tokens into it. The poster's
 * keep the listing's id. The listing itself doesn't change. A claim starts
 * accepted with the fixed claim window, its items live, and tells the
 * poster what to send; an offer on a listing that takes offers starts
 * pending with the offer window, proposed by the claimer, reserving
 * nothing, so offers on one listing may pick the same objekts, and tells
 * the poster it arrived. Starts the trade's timeline. Returns the trade's
 * id and whether it waits for the poster.
 */
export async function insertTrade(
  tx: WebTx,
  actor: ListingActor,
  { listing, submitted, states, offer }: Preflight,
  { toAddress, poster }: Awaited<ReturnType<typeof lockAndRecheck>>,
) {
  const [trade] = await tx
    .insert(tradeOffers)
    .values({
      kind: "trade",
      fromUserId: listing.fromUserId,
      toUserId: actor.userId,
      fromAddress: listing.fromAddress,
      toAddress,
      ...(offer
        ? {
            status: "pending",
            proposedBy: "to",
            expiresAt: sql`now() + make_interval(secs => ${OFFER_WINDOW / 1000})`,
          }
        : {
            status: "accepted",
            acceptedAt: sql`now()`,
            deadlineAt: sql`now() + make_interval(secs => ${CLAIM_WINDOW / 1000})`,
          }),
    })
    .returning({ id: tradeOffers.id });
  if (!trade) throw new Error("Trade insert returned no row");

  await refuseLiveClash(
    tx.insert(tradeOfferItems).values(
      listing.picked.map(
        ({ tokenId, attributes }) =>
          ({
            offerId: trade.id,
            listingId: listing.id,
            sender: "from",
            kind: "objekt",
            live: !offer,
            tokenId,
            ...attributes,
          }) satisfies NewTradeOfferItem,
      ),
    ),
    "listing_pick_unavailable",
  );
  await refuseLiveClash(
    tx.insert(tradeOfferItems).values(
      submitted.flatMap((tokenId) => {
        const state = states.get(tokenId);
        return state?.kind === "found"
          ? [
              {
                offerId: trade.id,
                sender: "to",
                kind: "objekt",
                live: !offer,
                tokenId,
                ...state.attributes,
              } satisfies NewTradeOfferItem,
            ]
          : [];
      }),
    ),
    "claim_token_unavailable",
  );
  await insertTradeEvent(tx, trade.id, {
    type: offer ? "offered" : "accepted",
  });
  await notifyUsers(tx, poster ? [poster] : [], {
    type: offer ? "offer_received" : "listing_claimed",
    offerId: trade.id,
    actorId: actor.userId,
    tokenId: null,
  });
  return { tradeId: trade.id, pending: offer };
}

/**
 * What accepting an offer on a listing judges it against, read before the
 * transaction: the listing's want rows and unit size. Only an edit changes
 * them, and an edit turns the listing's pending offers stale after locking
 * them, so these still hold once the accept has locked the offer and found
 * it pending.
 */
export async function readListingTerms(listingId: string) {
  const row = await db.query.tradeOffers.findFirst({
    where: { id: listingId, kind: "listing" },
    columns: { id: true, unitSize: true },
    with: { wants: storedWants },
  });
  if (!row) refuse("listing_closed");
  return {
    unitSize: listingUnitSize(row),
    wants: row.wants.map((want) => storedWantSchema.parse(want)),
  };
}

/**
 * Re-judges an offer on a listing that its poster is accepting, under the
 * users' and the offer's locks, as a claim would be judged: locks the
 * listing row `FOR NO KEY UPDATE` while it's still open, after the offer
 * (docs/auth.md), reads its pool, the parties' links, both sides' locks
 * and live trades and the claimer's claim cap, which accepting counts
 * toward, then refuses as offerRefusal() decides, the order the listing
 * page shows. The indexer states of both sides' tokens come from before
 * the transaction.
 */
export async function recheckListingOffer(
  tx: WebTx,
  trade: LockedTrade,
  users: readonly LockedUser[],
  terms: Awaited<ReturnType<typeof readListingTerms>>,
  tokens: ReadonlyMap<number, TokenState>,
) {
  const [offered] = tradeListings(trade.items);
  if (offered === undefined) {
    throw new Error(`trade ${trade.id} has no listing`);
  }
  // trade_offers_trade_chk pins the claimer's address; trade_offers_pending_chk an expiry
  if (trade.toAddress === null || trade.expiresAt === null) {
    throw new Error(`offer ${trade.id} has no claimer address or expiry`);
  }
  const [listingId, picks] = offered;
  const [listing] = await tx
    .select({ id: tradeOffers.id })
    .from(tradeOffers)
    .where(and(eq(tradeOffers.id, listingId), eq(tradeOffers.status, "open")))
    .for("no key update");
  if (!listing) refuse("listing_closed");

  const pool = await tx
    .select({ tokenId: tradeOfferItems.tokenId })
    .from(tradeOfferItems)
    .where(
      and(
        eq(tradeOfferItems.offerId, listingId),
        inArray(tradeOfferItems.tokenId, picks),
        isNull(tradeOfferItems.leftAt),
      ),
    );
  const given = trade.items.flatMap((item) =>
    item.sender === "to" && item.tokenId !== null ? [item.tokenId] : [],
  );
  const links = await readLockedLinks(tx, [trade.fromUserId, trade.toUserId]);
  const flagsFor = await readSharedTokenFlags(
    tx,
    [...picks, ...given],
    [trade.fromAddress, trade.toAddress],
  );
  // lockPartyTrade refused the poster's ban, so posterBlocked judges their link
  const poster = users.find((row) => row.id === trade.fromUserId);
  const claimer = users.find((row) => row.id === trade.toUserId);
  const refusal = offerRefusal(
    { expiresAt: trade.expiresAt, picks, given },
    {
      fromAddress: trade.fromAddress,
      pool: new Set(pool.flatMap((item) => item.tokenId ?? [])),
      unitSize: terms.unitSize,
      wants: tradeWants(terms.wants),
      posterRefused: posterBlocked(
        terms.wants,
        poster === undefined
          ? null
          : { ...poster, cosmoAccount: links.get(poster.id) ?? null },
        trade.fromAddress,
      ),
    },
    {
      address: trade.toAddress,
      linked:
        claimer !== undefined &&
        claimerLink(claimer, links.get(claimer.id)?.address, trade.toAddress)
          .kind === "linked",
      // only accepted and disputed trades count, so this offer isn't one yet
      atCap:
        claimer !== undefined &&
        (await claimStanding(tx, claimer.id).then(
          (standing) => standing.active >= claimCap(standing),
        )),
    },
    {
      states: tokens,
      poster: flagsFor(trade.fromAddress),
      claimer: flagsFor(trade.toAddress),
    },
    trade.now,
  );
  if (refusal) throw offerRefusalError(refusal);
}
