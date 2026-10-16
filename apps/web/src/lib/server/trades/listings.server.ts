import { isBanActive } from "@apollo/auth/guard";
import {
  tradeListingWants,
  tradeOfferItems,
  tradeOffers,
  user,
} from "@apollo/database/web/schema";
import type {
  NewTradeListingWant,
  NewTradeOfferItem,
  TradeOfferStatus,
} from "@apollo/database/web/types";
import type { ListingInput } from "@apollo/trades/listing";
import type { ObjektAttributes } from "@apollo/trades/range";
import { isEqual } from "@apollo/util";
import { and, eq } from "drizzle-orm";
import type { AuthErrorCode } from "../../universal/errors/auth";
import { ExpectedError } from "../../universal/errors/expected";
import type { TradeErrorCode } from "../../universal/errors/trades";
import type { TokenRefusal } from "../../universal/trade-listings";
import { getCosmoAddress } from "../cosmo-accounts.server";
import type { DbOrTx, WebTx } from "../db";
import {
  firstRefusal,
  readTokenStates,
  readWebTokenFlags,
  resolveWants,
  type ResolvedWant,
  type TokenHoldings,
} from "./holdings.server";

/**
 * The signed-in user acting on a listing, with the COSMO address their
 * session was checked against.
 */
export type ListingActor = { userId: string; address: string };

export function posterRow(executor: DbOrTx, userId: string) {
  return executor
    .select({ banned: user.banned, banExpires: user.banExpires })
    .from(user)
    .where(eq(user.id, userId));
}

export function refusePoster(
  row: { banned: boolean; banExpires: Date | null } | undefined,
) {
  if (!row) {
    throw new ExpectedError("not_signed_in" satisfies AuthErrorCode);
  }
  if (isBanActive(row)) {
    throw new ExpectedError("forbidden" satisfies AuthErrorCode);
  }
}

/**
 * Locks the poster's row `FOR SHARE`, so an account deletion or a ban can't
 * land halfway through the write, and refuses a poster who is gone or
 * banned.
 */
export async function lockPoster(tx: WebTx, userId: string) {
  const [row] = await posterRow(tx, userId).for("share");
  refusePoster(row);
}

/**
 * Locks the poster and returns their COSMO address as stored, refusing a
 * link that moved away from the address the session was checked against.
 */
export async function lockLinkedPoster(tx: WebTx, actor: ListingActor) {
  await lockPoster(tx, actor.userId);
  const link = await getCosmoAddress(tx, actor.userId);
  if (link.kind === "none" || !isEqual(link.address, actor.address)) {
    throw new ExpectedError("cosmo_not_linked" satisfies AuthErrorCode);
  }
  return link.address;
}

/**
 * The caller's own listing by id. Other people's listings and trade rows
 * read as missing, so a refusal never says what someone else's row is.
 */
export function ownListing(
  executor: DbOrTx,
  userId: string,
  listingId: string,
) {
  return executor
    .select({ status: tradeOffers.status })
    .from(tradeOffers)
    .where(
      and(
        eq(tradeOffers.id, listingId),
        eq(tradeOffers.kind, "listing"),
        eq(tradeOffers.fromUserId, userId),
      ),
    );
}

export function listingRefusal(
  listing: { status: TradeOfferStatus } | undefined,
): TradeErrorCode | null {
  if (!listing) return "listing_not_found";
  if (listing.status === "claimed") return "listing_claimed";
  return listing.status === "open" ? null : "listing_closed";
}

export function refuseEdit(listing: { status: TradeOfferStatus } | undefined) {
  const refusal = listingRefusal(listing);
  if (refusal !== null) throw new ExpectedError(refusal);
}

type OfferedToken = ObjektAttributes & { tokenId: number };

type CheckedTerms = {
  kind: "checked";
  tokenIds: number[];
  holdings: TokenHoldings;
  offered: OfferedToken[];
  wants: ResolvedWant[];
};

/**
 * Checks a listing's terms before any transaction opens: every want must be
 * fillable, then every offered token must be the poster's to offer. Returns
 * the indexer values to copy.
 */
export async function checkTerms(
  address: string,
  input: ListingInput,
): Promise<CheckedTerms | TokenRefusal> {
  const tokenIds = input.offered.map(({ tokenId }) => tokenId);
  const wants = await resolveWants(input.wants);
  const holdings = await readTokenStates(address, tokenIds);

  return (
    firstRefusal(tokenIds, holdings, address) ?? {
      kind: "checked",
      tokenIds,
      holdings,
      offered: tokenIds.flatMap((tokenId) => {
        const state = holdings.states.get(tokenId);
        return state?.kind === "found"
          ? [{ tokenId, ...state.attributes }]
          : [];
      }),
      wants,
    }
  );
}

/**
 * Re-reads locks and live trades under the poster's lock, since either can
 * change after the indexer checks.
 */
export async function recheckTokens(
  tx: WebTx,
  address: string,
  terms: CheckedTerms,
) {
  const flags = await readWebTokenFlags(tx, address, terms.tokenIds);
  return firstRefusal(
    terms.tokenIds,
    { states: terms.holdings.states, ...flags },
    address,
  );
}

const distinct = (values: string[]) => [...new Set(values)];

/**
 * The listing-level arrays: every value any offered objekt has, deduped.
 */
export function listingArrays(offered: OfferedToken[]) {
  return {
    slugs: distinct(offered.map((token) => token.slug)),
    artists: distinct(offered.map((token) => token.artist)),
    seasons: distinct(offered.map((token) => token.season)),
    members: distinct(offered.map((token) => token.member)),
    classes: distinct(offered.map((token) => token.class)),
    onOfflines: distinct(offered.map((token) => token.onOffline)),
  };
}

function wantRow(listingId: string, want: ResolvedWant): NewTradeListingWant {
  switch (want.kind) {
    case "exact":
      return { listingId, kind: "exact", count: want.count, ...want.objekt };
    case "range":
      return {
        listingId,
        kind: "range",
        count: want.count,
        artists: want.filter.artist,
        members: want.filter.member,
        seasons: want.filter.season,
        classes: want.filter.class,
        onOfflines: want.filter.on_offline,
      };
  }
}

/**
 * Inserts the listing's own items, never live and with no `listing_id`,
 * then its wants in one statement, so id order is the posted order.
 */
export async function insertTerms(
  tx: WebTx,
  listingId: string,
  terms: CheckedTerms,
) {
  await tx.insert(tradeOfferItems).values(
    terms.offered.map(
      (token) =>
        ({
          offerId: listingId,
          sender: "from",
          kind: "objekt",
          live: false,
          ...token,
        }) satisfies NewTradeOfferItem,
    ),
  );
  await tx
    .insert(tradeListingWants)
    .values(terms.wants.map((want) => wantRow(listingId, want)));
}
