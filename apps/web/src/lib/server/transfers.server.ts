import type { transfersBackendSchema } from "@/lib/universal/parsers";
import {
  type ChainItem,
  chainedIds,
  chainTransfers,
  groupTransfers,
  pairSpins,
  spinOutcome,
  time,
  TRADE_GAP_MS,
  tradedIds,
} from "@/lib/universal/transfer-grouping";
import type {
  TransferObjekt,
  TransferResult,
  TransferType,
} from "@/lib/universal/transfers";
import { Addresses, isEqual } from "@apollo/util";
import {
  and,
  desc,
  eq,
  gte,
  inArray,
  lte,
  ne,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { union, unionAll } from "drizzle-orm/pg-core";
import type { z } from "zod";
import { indexer } from "./db/indexer";
import {
  type Collection,
  collections,
  objekts,
  transfers,
} from "./db/indexer/schema";
import {
  withArtist,
  withClass,
  withMember,
  withOnlineType,
  withSeason,
  withSelectedArtists,
  withSpinMonth,
} from "./objekts/filters.server";

const PER_PAGE = 60;

/**
 * Filters decided in memory (trades, one-way transfers, mints that aren't
 * spin rewards, spin outcomes) examine this many candidates per page. A page
 * can come back short; infinite scroll asks for the next one.
 */
const CANDIDATES = 120;

/**
 * How far around each candidate the neighbourhood reaches: far enough to pair
 * spins with rewards, find a trade's other side and chain a batch.
 */
const NEIGHBOURHOOD_MS = TRADE_GAP_MS;

/**
 * Extra reach at the page's newest and oldest edges, so a trade or batch that
 * continues past the page is grouped the same way on both pages.
 */
const EDGE_MS = 60 * 60 * 1000;

type Payload = z.infer<typeof transfersBackendSchema>;
type Cursor = ReturnType<typeof decodeCursor>;
type Candidate = ChainItem["transfer"];

/**
 * Candidate columns, all covered by the address indexes so reading them stays
 * index-only.
 */
const candidateColumns = {
  id: transfers.id,
  timestamp: transfers.timestamp,
  from: transfers.from,
  to: transfers.to,
};

/**
 * The null and spin addresses as literals rather than parameters. Every
 * statement is prepared, and Postgres' generic plan can't tell that millions
 * of transfers involve these addresses, so with a parameter it walks the spin
 * address's index looking for one user's spins.
 */
const NULL_ADDRESS = sql.raw(`'${Addresses.NULL}'`);
const SPIN_ADDRESS = sql.raw(`'${Addresses.SPIN}'`);

/**
 * Fetch a page of transfers for an address, folded into display rows.
 *
 * Three statements: a walk down the owner's address indexes for candidates,
 * the owner's transfers around them read straight off those indexes, then
 * the objekts of just the transfers the page displays. Pairing spins, finding
 * trades and grouping batches all happen in memory on the neighbourhood.
 */
export async function fetchTransferRows(
  address: string,
  params: Payload,
): Promise<TransferResult> {
  const addr = address.toLowerCase();
  const type = params.type ?? "all";
  const isSpinAddress = isEqual(addr, Addresses.SPIN);
  const limit = decidedInMemory(params) ? CANDIDATES : PER_PAGE;

  const candidates = toItems(
    await walk(
      addr,
      type,
      params,
      withSpinMonth(isSpinAddress, transfers.timestamp),
      decodeCursor(params.cursor),
      limit,
    ),
  );
  const neighbourhood = await fetchNeighbourhood(
    addr,
    candidates,
    // everyone's spins land on the spin address; it has no trades to find
    isSpinAddress ? 0 : NEIGHBOURHOOD_MS,
  );

  const pairs = pairSpins(
    neighbourhood.filter(
      ({ transfer: { from, to } }) => from === addr && to === Addresses.SPIN,
    ),
    neighbourhood.filter(
      ({ transfer: { from, to } }) => from === Addresses.NULL && to === addr,
    ),
  );
  const chains = chainTransfers(addr, neighbourhood);
  const context: Context = {
    pairs,
    rewardIds: new Set(pairs.values()),
    traded: tradedIds(addr, chains),
    now: Date.now(),
  };

  // only what the page displays needs its objekt
  const kept = candidates
    .filter((c) => matchesInMemory(params, c, context))
    .slice(0, PER_PAGE);
  const chained = chainedIds(addr, kept, chains);
  const wanted = new Set([
    ...kept.map((t) => t.transfer.id),
    ...kept.flatMap((t) => pairs.get(t.transfer.id) ?? []),
    ...chained,
  ]);
  const loaded = new Map(
    (
      await hydrate(
        addr,
        neighbourhood.filter((t) => wanted.has(t.transfer.id)),
      )
    ).map((t) => [t.transfer.id, t] as const),
  );

  const related = [...chained].flatMap((id) => loaded.get(id) ?? []);
  const matchesCollection = collectionMatcher(params);
  return {
    results: groupTransfers({
      address: addr,
      page: kept.flatMap((t) => loaded.get(t.transfer.id) ?? []),
      rewards: new Map(
        [...pairs].flatMap(([spinId, rewardId]) => {
          const reward = loaded.get(rewardId);
          return reward ? [[spinId, reward] as const] : [];
        }),
      ),
      rewardIds: context.rewardIds,
      related,
      /**
       * Related transfers share a chain with a kept candidate, so they already
       * match its type branch and, on the spin address, its month.
       */
      inStream: new Set(
        related
          .filter(
            (t) =>
              matchesCollection(t.collection) &&
              matchesInMemory(params, t, context),
          )
          .map((t) => t.transfer.id),
      ),
      now: context.now,
    }),
    cursor: nextCursor(kept, candidates, limit),
  };
}

/**
 * Where the next page starts: after the last row kept once the page is full,
 * else after the last candidate examined, else nowhere when the walk ran out.
 */
function nextCursor(kept: ChainItem[], candidates: ChainItem[], limit: number) {
  const last = (
    kept.length === PER_PAGE
      ? kept
      : candidates.length === limit
        ? candidates
        : []
  ).at(-1);
  return last
    ? encodeCursor(last.transfer.timestamp, last.transfer.id)
    : undefined;
}

/**
 * Whether a type filter needs the neighbourhood to decide.
 */
function decidedInMemory(params: Payload) {
  switch (params.type) {
    case "trade":
    case "sent":
    case "received":
    case "mint":
      return true;
    case "spin":
      return Boolean(params.outcome);
    default:
      return false;
  }
}

/**
 * The newest candidates for a page, as one statement. `all` and `trade` walk
 * both address indexes, since an OR across from/to can't use either one.
 */
async function walk(
  address: string,
  type: TransferType,
  params: Payload,
  extra: SQL[],
  cursor: Cursor,
  limit: number,
): Promise<Candidate[]> {
  const where = [...extra, ...cursorFilter(cursor)];
  const [first, second] = branchConditions(address, type).map((condition) =>
    walkQuery(params, condition, where)
      .orderBy(desc(transfers.timestamp), desc(transfers.id))
      .limit(limit),
  );

  if (!first) return [];
  if (!second) return first;
  return union(first, second)
    .orderBy(desc(transfers.timestamp), desc(transfers.id))
    .limit(limit);
}

/**
 * The owner's index each branch walks, and what it keeps.
 */
function branchConditions(address: string, type: TransferType) {
  const sent = and(
    eq(transfers.from, address),
    sql`${transfers.to} not in (${NULL_ADDRESS}, ${SPIN_ADDRESS})`,
  );
  const received = and(
    eq(transfers.to, address),
    ne(transfers.from, NULL_ADDRESS),
  );

  switch (type) {
    case "all":
      return [eq(transfers.from, address), eq(transfers.to, address)];
    case "trade":
      return [sent, received];
    case "sent":
      return [sent];
    case "received":
      return [received];
    case "mint":
      return [and(eq(transfers.from, NULL_ADDRESS), eq(transfers.to, address))];
    case "spin":
      return [and(eq(transfers.from, address), eq(transfers.to, SPIN_ADDRESS))];
  }
}

/**
 * One branch of the walk. Collection filters join the collection, so only an
 * unfiltered walk stays index-only.
 */
function walkQuery(params: Payload, condition: SQL | undefined, where: SQL[]) {
  const byCollection = collectionFilters(params);
  const query = indexer.select(candidateColumns).from(transfers).$dynamic();

  return byCollection.length > 0
    ? query
        .leftJoin(collections, eq(transfers.collectionId, collections.id))
        .where(and(condition, ...byCollection, ...where))
    : query.where(and(condition, ...where));
}

/**
 * The owner's transfers within reach of the candidates: one index-only range
 * scan per window and address index, in one statement.
 */
async function fetchNeighbourhood(
  address: string,
  candidates: ChainItem[],
  reach: number,
): Promise<ChainItem[]> {
  const [first, second, ...rest] = timeWindows(candidates, reach).flatMap(
    (window) =>
      [transfers.from, transfers.to].map((column) =>
        indexer
          .select(candidateColumns)
          .from(transfers)
          .where(and(eq(column, address), window)),
      ),
  );
  if (!first) return [];
  const rows = second ? await unionAll(first, second, ...rest) : await first;

  // a transfer to yourself shows up from both sides
  return toItems([...new Map(rows.map((r) => [r.id, r] as const)).values()]);
}

/**
 * Load transfers with their serial and collection, looked up through the
 * owner's address indexes by timestamp rather than the random UUID key.
 */
async function hydrate(
  address: string,
  items: ChainItem[],
): Promise<TransferObjekt[]> {
  const sides = [
    {
      column: transfers.from,
      times: items.filter((t) => t.transfer.from === address),
    },
    {
      column: transfers.to,
      times: items.filter((t) => t.transfer.from !== address),
    },
  ].flatMap(({ column, times }) =>
    times.length === 0
      ? []
      : [
          and(
            eq(column, address),
            inArray(transfers.timestamp, [
              ...new Set(times.map((t) => t.transfer.timestamp)),
            ]),
          ),
        ],
  );
  if (sides.length === 0) return [];

  const rows = await indexer
    .select({
      transfer: transfers,
      serial: objekts.serial,
      collection: collections,
    })
    .from(transfers)
    .leftJoin(objekts, eq(transfers.objektId, objekts.id))
    .leftJoin(collections, eq(transfers.collectionId, collections.id))
    .where(or(...sides));

  // a timestamp can match other transfers made in the same second
  const wanted = new Set(items.map((t) => t.transfer.id));
  return rows
    .filter((row) => wanted.has(row.transfer.id))
    .map((row) => ({
      // the indexer's string timestamps aren't ISO, which older Safari rejects
      transfer: {
        ...row.transfer,
        timestamp: new Date(row.transfer.timestamp).toISOString(),
      },
      serial: row.serial,
      collection: row.collection,
    }));
}

/**
 * Time ranges covering each candidate padded by `reach`, overlapping ranges
 * merged, with the page's edges reaching further.
 */
function timeWindows(candidates: ChainItem[], reach: number) {
  const times = candidates.map(time).toSorted((a, b) => a - b);
  const edge = reach > 0 ? EDGE_MS : 0;

  const merged: { lo: number; hi: number }[] = [];
  for (const [i, at] of times.entries()) {
    const lo = at - reach - (i === 0 ? edge : 0);
    const hi = at + reach + (i === times.length - 1 ? edge : 0);
    const last = merged.at(-1);
    if (last && lo <= last.hi) {
      last.hi = Math.max(last.hi, hi);
    } else {
      merged.push({ lo, hi });
    }
  }

  return merged.map(({ lo, hi }) =>
    and(
      gte(transfers.timestamp, new Date(lo).toISOString()),
      lte(transfers.timestamp, new Date(hi).toISOString()),
    ),
  );
}

/**
 * The collection filters, checked on a loaded row.
 */
function collectionMatcher(params: Payload) {
  if (collectionFilters(params).length === 0) return () => true;

  const artist = params.artist?.toLowerCase();
  const artists = params.artists.map((a) => a.toLowerCase());
  const within = (list: string[] | null | undefined, value: string) =>
    !list || list.length === 0 || list.includes(value);

  return (collection: Collection | null) =>
    collection !== null &&
    (!artist || collection.artist === artist) &&
    within(params.class, collection.class) &&
    within(params.season, collection.season) &&
    within(params.on_offline, collection.onOffline) &&
    within(params.member, collection.member) &&
    within(artists, collection.artist);
}

type Context = {
  pairs: Map<string, string>;
  rewardIds: Set<string>;
  traded: Set<string>;
  now: number;
};

/**
 * The filters SQL can't decide on its own. Trades are chains that went both
 * ways, so a one-way filter skips their transfers.
 */
function matchesInMemory(
  params: Payload,
  t: ChainItem,
  { pairs, rewardIds, traded, now }: Context,
) {
  const { id } = t.transfer;
  switch (params.type) {
    case "trade":
      return traded.has(id);
    case "sent":
    case "received":
      return !traded.has(id);
    case "mint":
      return !rewardIds.has(id);
    case "spin":
      return (
        !params.outcome || spinOutcome(t, pairs.has(id), now) === params.outcome
      );
    default:
      return true;
  }
}

/**
 * Build the filters for the collections table.
 */
function collectionFilters(params: Payload) {
  return [
    ...withArtist(params.artist),
    ...withClass(params.class ?? []),
    ...withSeason(params.season ?? []),
    ...withOnlineType(params.on_offline ?? []),
    ...withMember(params.member),
    ...withSelectedArtists(params.artists),
  ];
}

/**
 * Transfers strictly older than the cursor, in list order.
 */
function cursorFilter(cursor: Cursor) {
  return cursor
    ? [
        sql`(${transfers.timestamp}, ${transfers.id}) < (${cursor.timestamp}::timestamptz, ${cursor.id})`,
      ]
    : [];
}

/**
 * Decode a base64 cursor into timestamp and id.
 */
function decodeCursor(cursor: string | null | undefined) {
  if (!cursor) return null;

  try {
    const decoded = Buffer.from(cursor, "base64").toString();
    const [timestamp, id] = decoded.split("|");
    return timestamp && id ? { timestamp, id } : null;
  } catch {
    return null;
  }
}

/**
 * Encode timestamp and id into a base64 cursor.
 */
function encodeCursor(timestamp: string, id: string) {
  return Buffer.from(`${timestamp}|${id}`).toString("base64");
}

function toItems(rows: Candidate[]) {
  return rows.map((transfer) => ({ transfer }));
}
