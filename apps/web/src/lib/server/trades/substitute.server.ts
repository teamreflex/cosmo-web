import {
  collections,
  objekts,
  transfers,
} from "@apollo/database/indexer/schema";
import { tradeOfferItems } from "@apollo/database/web/schema";
import type { TradeSide } from "@apollo/database/web/types";
import { otherSide } from "@apollo/trades/lifecycle";
import { addr } from "@apollo/util";
import { and, desc, eq, gte, inArray, lte, ne, or } from "drizzle-orm";
import {
  type SubstituteCandidate,
  substituteSource,
} from "../../universal/trades";
import { fetchKnownAddresses } from "../cosmo-accounts.server";
import { db, type DbOrTx } from "../db";
import { indexer } from "../db/indexer";
import { watermarkExtra } from "./trade-view.server";
import { refuseTrade } from "./trade.server";

const CANDIDATE_LIMIT = 20;

// chain timestamps can sit a little behind the database clock that stamped accepted_at
const ACCEPTED_SLACK_MS = 60_000;

/**
 * An objekt the caller is owed and hasn't received, with what another copy
 * must match to be accepted in its place: its collection, the caller's
 * pinned address as receiver, and a transfer between the trade's acceptance
 * and the drain's watermark, so the drain has already recorded any pinned
 * arrival that transfer was. Read unlocked: the accept re-judges the trade
 * under its lock, which the trade's parties are locked ahead of.
 */
export type SubstituteTarget = {
  fromUserId: string | null;
  toUserId: string | null;
  tokenId: number;
  slug: string;
  senderAddress: string;
  receiverAddress: string;
  since: Date;
  until: Date;
};

export async function readSubstituteTarget(
  userId: string,
  tradeId: string,
  itemId: number,
): Promise<SubstituteTarget> {
  const trade = await db.query.tradeOffers.findFirst({
    where: {
      id: tradeId,
      kind: "trade",
      OR: [{ fromUserId: userId }, { toUserId: userId }],
    },
    columns: {
      fromUserId: true,
      toUserId: true,
      fromAddress: true,
      toAddress: true,
      acceptedAt: true,
    },
    extras: { watermark: watermarkExtra },
    with: {
      items: {
        where: { id: itemId },
        columns: {
          kind: true,
          sender: true,
          tokenId: true,
          slug: true,
          transferredAt: true,
        },
      },
    },
  });
  if (!trade) refuseTrade("trade_not_found");

  const [item] = trade.items;
  const receiver: TradeSide = trade.fromUserId === userId ? "from" : "to";
  const addresses = { from: trade.fromAddress, to: trade.toAddress };
  const receiverAddress = addresses[receiver];
  const senderAddress = addresses[otherSide(receiver)];
  if (
    item?.kind !== "objekt" ||
    item.tokenId === null ||
    item.slug === null ||
    item.sender === receiver ||
    item.transferredAt !== null ||
    trade.acceptedAt === null ||
    receiverAddress === null ||
    senderAddress === null ||
    trade.watermark === null
  ) {
    refuseTrade("trade_status_changed");
  }
  return {
    fromUserId: trade.fromUserId,
    toUserId: trade.toUserId,
    tokenId: item.tokenId,
    slug: item.slug,
    senderAddress,
    receiverAddress,
    since: new Date(trade.acceptedAt.getTime() - ACCEPTED_SLACK_MS),
    until: trade.watermark,
  };
}

/**
 * The indexer transfers another copy could come from: to the receiver's
 * pinned address, of the item's collection, inside the target's window,
 * and never the pinned token. `transfer_to_ts_id_incl_idx` serves the
 * address and window.
 */
function withinTarget(target: SubstituteTarget) {
  return and(
    eq(transfers.to, addr(target.receiverAddress)),
    gte(transfers.timestamp, target.since),
    lte(transfers.timestamp, target.until),
    eq(collections.slug, target.slug),
    // the indexer's ids are text; web stores them as integers
    ne(transfers.tokenId, String(target.tokenId)),
  );
}

/**
 * The newest transfers another copy of the target's objekt could be,
 * leaving out any an item already records, as its pinned arrival or as an
 * accepted copy, each with where it came from.
 */
export async function readSubstituteCandidates(
  target: SubstituteTarget,
): Promise<SubstituteCandidate[]> {
  const rows = (
    await indexer
      .select({
        tokenId: transfers.tokenId,
        hash: transfers.hash,
        at: transfers.timestamp,
        from: transfers.from,
        serial: objekts.serial,
      })
      .from(transfers)
      .innerJoin(collections, eq(collections.id, transfers.collectionId))
      .innerJoin(objekts, eq(objekts.id, transfers.objektId))
      .where(withinTarget(target))
      .orderBy(desc(transfers.timestamp), desc(transfers.id))
      .limit(CANDIDATE_LIMIT)
  ).map((row) => ({ ...row, tokenId: Number(row.tokenId) }));
  if (rows.length === 0) return [];

  const used = await usedTransfers(db, rows);
  const fresh = rows.filter((row) => !used.includes(row));
  const known = await fetchKnownAddresses(fresh.map((row) => row.from));
  return fresh.map((row) => ({
    tokenId: row.tokenId,
    serial: row.serial,
    hash: row.hash,
    at: row.at,
    from: substituteSource(row.from, target.senderAddress, known),
  }));
}

/**
 * When and where from the transfer the caller picked was sent, if it's
 * still one they could accept: looked up by `objekt_id`, which is the token
 * id as text and indexed, then held to the target's rules. Refuses
 * `substitute_unavailable` otherwise, including a transfer a hot block
 * rolled back.
 */
export async function readSubstituteTransfer(
  target: SubstituteTarget,
  tokenId: number,
  hash: string,
) {
  const [row] = await indexer
    .select({ at: transfers.timestamp, from: transfers.from })
    .from(transfers)
    .innerJoin(collections, eq(collections.id, transfers.collectionId))
    .where(
      and(
        eq(transfers.objektId, String(tokenId)),
        eq(transfers.hash, hash),
        withinTarget(target),
      ),
    );
  if (!row) refuseTrade("substitute_unavailable");
  return row;
}

/**
 * The transfers among these that an item already records, as its pinned
 * arrival or an accepted copy, read through `trade_offer_items_token_idx`
 * and `trade_offer_items_substitute_idx`.
 */
export async function usedTransfers<
  Transfer extends { tokenId: number; hash: string },
>(executor: DbOrTx, transfers: readonly Transfer[]) {
  const tokenIds = transfers.map(({ tokenId }) => tokenId);
  const items = await executor
    .select({
      tokenId: tradeOfferItems.tokenId,
      substituteTokenId: tradeOfferItems.substituteTokenId,
      txHash: tradeOfferItems.txHash,
    })
    .from(tradeOfferItems)
    .where(
      or(
        inArray(tradeOfferItems.tokenId, tokenIds),
        inArray(tradeOfferItems.substituteTokenId, tokenIds),
      ),
    );
  return transfers.filter(({ tokenId, hash }) =>
    items.some(
      (item) =>
        item.txHash === hash &&
        (item.tokenId === tokenId || item.substituteTokenId === tokenId),
    ),
  );
}
