import { isBanActive } from "@apollo/auth/guard";
import { tradeOfferItems, tradeOffers } from "@apollo/database/web/schema";
import {
  type NewTradeOfferItem,
  openTradeStatuses,
  type TradeOfferStatus,
} from "@apollo/database/web/types";
import {
  listingOfferRefusal,
  type OfferedToken,
  scaleWants,
  unitsOf,
} from "@apollo/trades/allocate";
import { validateAssignment } from "@apollo/trades/assignment";
import { claimCap } from "@apollo/trades/caps";
import { takesOffers, tradeListings } from "@apollo/trades/lifecycle";
import type { ClaimListingInput } from "@apollo/trades/listing";
import { CLAIM_WINDOW, OFFER_WINDOW } from "@apollo/trades/timers";
import { isEqual } from "@apollo/util";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type * as z from "zod";
import type { AuthErrorCode } from "../../universal/errors/auth";
import { ExpectedError } from "../../universal/errors/expected";
import type {
  ListingPickRefusal,
  OfferPartnerTokenRefusal,
  TradeErrorCode,
} from "../../universal/errors/trades";
import {
  storedObjektItemSchema,
  type StoredWant,
  storedWantSchema,
  toTradeWant,
} from "../../universal/trade-listings";
import { db, type DbOrTx, type WebTx } from "../db";
import { claimStanding } from "./detail.server";
import { storedWants } from "./feed.server";
import {
  firstRefusal,
  readIndexerTokens,
  readTokenStates,
  readWebTokenFlags,
  type TokenState,
} from "./holdings.server";
import type { ListingActor } from "./listings.server";
import {
  type PosterAccount,
  type PosterFacts,
  posterLinkColumns,
  posterRefusal,
  toPosterAccount,
} from "./poster.server";
import {
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
 * Refuses a claim, an offer on a listing or the poster's accept of one when
 * the poster's picked objekts include one they can't give right now, naming
 * it, so the picker can drop it.
 */
function refusePick(tokenId: number): never {
  throw new ExpectedError("listing_pick_unavailable", {
    tokenId,
  } satisfies ListingPickRefusal);
}

// refuses the poster's accept over one of the claimer's tokens, naming it but never why, as direct offers do
function refuseClaimerToken(tokenId: number): never {
  throw new ExpectedError("offer_unavailable", {
    tokenId,
  } satisfies OfferPartnerTokenRefusal);
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
  poster: PosterFacts;
  pickedStates: ReadonlyMap<number, TokenState>;
  submitted: number[];
  claimerStates: ReadonlyMap<number, TokenState>;
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
  // trade_offers_unit_size_chk: every listing has a unit size
  if (row.unitSize === null) throw new Error(`listing ${row.id} has no unit`);

  const wants = row.wants.map((want) => storedWantSchema.parse(want));
  const poster: PosterFacts = {
    wantKinds: wants.map((want) => want.kind),
    poster: row.fromUser && toPosterAccount(row.fromUser),
  };
  // a commit since the status read is the better answer to a refused pick
  const refuseAfterRecheck = async (refusal: () => never) => {
    const [now] = await listingStatus(db, row.id);
    const changed = statusRefusal(now, input.seen);
    if (changed) refuse(changed);
    refusal();
  };
  if (posterRefusal(poster, row.fromAddress)) {
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
    unitsOf(picked.length, row.unitSize) !== input.units
  ) {
    refuse("claim_assignment_invalid");
  }

  const submitted = input.rows.flat();
  const [pickedHoldings, claimerStates] = await Promise.all([
    readTokenStates(row.fromAddress, input.picked),
    readIndexerTokens(submitted),
  ]);
  const unavailable = firstRefusal(
    input.picked,
    pickedHoldings,
    row.fromAddress,
  );
  if (unavailable) {
    await refuseAfterRecheck(() => refusePick(unavailable.tokenId));
  }

  const states = [...claimerStates.values()];
  const missing = states.find((state) => state.kind === "missing");
  if (missing) {
    refuseToken({ tokenId: missing.tokenId, reason: "not_owned" });
  }
  const found = states.flatMap((state) =>
    state.kind === "found" ? [state] : [],
  );
  // posterRefusal has refused payment rows, so every want is an objekt row
  const assignment = validateAssignment(
    scaleWants(
      wants.flatMap((want) => toTradeWant(want) ?? []),
      input.units,
    ),
    input.rows,
    new Map(found.map((state) => [state.tokenId, state.attributes])),
  );
  if (!assignment.ok) refuse("claim_assignment_invalid");

  // locks and live trades are read under the lock, after the account checks
  const unflagged = firstRefusal(
    submitted,
    { states: claimerStates, locked: new Set(), live: new Set() },
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
    poster,
    pickedStates: pickedHoldings.states,
    submitted,
    claimerStates,
    offer: takesOffers(wants),
  };
}

/**
 * The first of the tokens `address` can't give now, judged on the indexer
 * states read before the transaction and on the locks and live trades read
 * under it.
 */
async function lockedRefusal(
  tx: WebTx,
  address: string,
  tokenIds: readonly number[],
  states: ReadonlyMap<number, TokenState>,
) {
  return firstRefusal(
    tokenIds,
    { states, ...(await readWebTokenFlags(tx, address, tokenIds)) },
    address,
  );
}

/**
 * The poster's account as their locked row and the link read under its lock
 * have it, for posterRefusal, or null when their account is gone.
 */
function lockedPoster(
  row: LockedUser | undefined,
  link: { address: string; username: string } | undefined,
): PosterAccount | null {
  return row === undefined
    ? null
    : {
        banned: row.banned,
        banExpires: row.banExpires,
        link:
          link === undefined ? { kind: "none" } : { kind: "linked", ...link },
      };
}

/**
 * The claimer's COSMO address as stored, as their locked row and the link
 * read under its lock have it, or why they can't take part: an active ban,
 * or a link that moved away from the address they're held to.
 */
function claimerLink(
  claimer: LockedUser,
  linked: string | undefined,
  address: string,
):
  | { kind: "linked"; address: string }
  | { kind: "refused"; refusal: "forbidden" | "cosmo_not_linked" } {
  if (isBanActive(claimer)) return { kind: "refused", refusal: "forbidden" };
  return linked === undefined || !isEqual(linked, address)
    ? { kind: "refused", refusal: "cosmo_not_linked" }
    : { kind: "linked", address: linked };
}

/**
 * Whether the claimer holds as many claims as their cap allows. Only an
 * accepted or disputed trade counts, so an offer on a listing counts once
 * it's accepted.
 */
async function atClaimCap(tx: WebTx, userId: string) {
  const standing = await claimStanding(tx, userId);
  return standing.active >= claimCap(standing);
}

/**
 * Whether the claimer already has a trade from the listing that is under
 * way: a live claim, or an offer on it still waiting for the poster. Its
 * poster's items keep the listing's id.
 */
async function hasOpenClaim(tx: WebTx, listingId: string, userId: string) {
  const [claim] = await tx
    .select({ id: tradeOffers.id })
    .from(tradeOfferItems)
    .innerJoin(tradeOffers, eq(tradeOffers.id, tradeOfferItems.offerId))
    .where(
      and(
        eq(tradeOfferItems.listingId, listingId),
        eq(tradeOffers.toUserId, userId),
        inArray(tradeOffers.status, [...openTradeStatuses]),
      ),
    )
    .limit(1);
  return claim !== undefined;
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
  preflight: Preflight,
) {
  const { listing, poster: facts, pickedStates } = preflight;
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
    posterRefusal(
      {
        ...facts,
        poster: lockedPoster(poster, poster && links.get(poster.id)),
      },
      listing.fromAddress,
    )
  ) {
    refuse("listing_unavailable");
  }
  const unavailable = await lockedRefusal(
    tx,
    listing.fromAddress,
    listing.picked.map(({ tokenId }) => tokenId),
    pickedStates,
  );
  if (unavailable) refusePick(unavailable.tokenId);

  const link = claimerLink(
    claimer,
    links.get(actor.userId)?.address,
    actor.address,
  );
  if (link.kind === "refused") refuse(link.refusal);
  if (await hasOpenClaim(tx, listing.id, actor.userId)) {
    refuse("listing_claim_exists");
  }
  if (!preflight.offer && (await atClaimCap(tx, actor.userId))) {
    refuse("claim_cap_reached");
  }

  const token = await lockedRefusal(
    tx,
    actor.address,
    preflight.submitted,
    preflight.claimerStates,
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
  { listing, submitted, claimerStates, offer }: Preflight,
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
        const state = claimerStates.get(tokenId);
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
  // trade_offers_unit_size_chk: every listing has a unit size
  if (row.unitSize === null) throw new Error(`listing ${row.id} has no unit`);
  return {
    unitSize: row.unitSize,
    wants: row.wants.map((want) => storedWantSchema.parse(want)),
  };
}

/**
 * Re-judges an offer on a listing that its poster is accepting, under the
 * users' and the offer's locks, as a claim would be judged: locks the
 * listing row `FOR NO KEY UPDATE` while it's still open, after the offer
 * (docs/auth.md), then checks that the picks are still in its pool and
 * make a whole number of its units, that the claimer's tokens still fill
 * its want rows scaled to those units exactly, the poster's account, that
 * the picks are deliverable and in no other live trade, the claimer's
 * link to the pinned address and ban, their claim cap, which accepting
 * counts toward, and that their tokens are still theirs to give. The
 * indexer states of both sides' tokens come from before the transaction.
 * A refusal about the claimer's side never says what, as with direct
 * offers, except the cap (`offer_claimer_at_cap`), so the poster knows the
 * offer can be accepted once the claimer finishes a trade.
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
  const [listingId, picks] = offered;
  const [listing] = await tx
    .select({ id: tradeOffers.id })
    .from(tradeOffers)
    .where(and(eq(tradeOffers.id, listingId), eq(tradeOffers.status, "open")))
    .for("no key update");
  if (!listing) refuse("listing_closed");

  // the terms: picks still in the pool, whole units, and tokens filling the scaled rows
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
  const misfit = listingOfferRefusal(
    {
      picks,
      given: given.map((tokenId): OfferedToken => {
        const state = tokens.get(tokenId);
        return state?.kind === "found"
          ? { kind: "found", tokenId, ...state.attributes }
          : { kind: "missing", tokenId };
      }),
    },
    {
      pool: new Set(pool.flatMap((item) => item.tokenId ?? [])),
      unitSize: terms.unitSize,
      wants: terms.wants.flatMap((want) => toTradeWant(want) ?? []),
    },
  );
  if (misfit?.reason === "token_missing") refuseClaimerToken(misfit.tokenId);
  if (misfit) refuse("listing_updated");

  // the poster's side, which is the caller's: lockPartyTrade refused a ban, so this is their link, then the picks
  const links = await readLockedLinks(tx, [trade.fromUserId, trade.toUserId]);
  const poster = users.find((row) => row.id === trade.fromUserId);
  if (
    posterRefusal(
      {
        wantKinds: terms.wants.map((want) => want.kind),
        poster: lockedPoster(poster, poster && links.get(poster.id)),
      },
      trade.fromAddress,
    )
  ) {
    refuse("cosmo_not_linked");
  }
  const pick = await lockedRefusal(tx, trade.fromAddress, picks, tokens);
  if (pick?.reason === "live") refusePick(pick.tokenId);
  if (pick) refuseToken(pick);

  // the claimer's side, never saying why but for the cap, which they clear by finishing a trade
  const claimer = users.find((row) => row.id === trade.toUserId);
  if (
    !claimer ||
    trade.toAddress === null ||
    claimerLink(claimer, links.get(claimer.id)?.address, trade.toAddress)
      .kind === "refused"
  ) {
    refuse("offer_unavailable");
  }
  if (await atClaimCap(tx, claimer.id)) refuse("offer_claimer_at_cap");
  const token = await lockedRefusal(tx, trade.toAddress, given, tokens);
  if (token) refuseClaimerToken(token.tokenId);
}
