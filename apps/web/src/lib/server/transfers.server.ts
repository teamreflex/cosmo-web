import type { transfersBackendSchema } from "@/lib/universal/parsers";
import {
  chainedIds,
  type ChainItem,
  chainTransfers,
  groupTransfers,
  pairSpins,
  rowTransfers,
  spinOutcome,
  time,
  TRADE_GAP_MS,
  tradedIds,
  unfinishedChains,
} from "@/lib/universal/transfer-grouping";
import type {
  TransferObjekt,
  TransferResult,
  TransferType,
} from "@/lib/universal/transfers";
import { Addresses, isEqual } from "@apollo/util";
import {
  and,
  between,
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
import { collections, objekts, transfers } from "./db/indexer/schema";
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
 * continues a little past the page is read without a fourth statement.
 */
const EDGE_MS = 60 * 60 * 1000;

type Payload = z.infer<typeof transfersBackendSchema>;
type Cursor = ReturnType<typeof decodeCursor>;
type Candidate = ChainItem["transfer"];
type Nearby = Candidate & { inCollections: boolean };

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
 * the objekts of just the transfers the page displays. A chain that runs
 * past the transfers around the candidates costs a fourth statement, which
 * reads the rest of it, and a page that displays nothing skips the objekts.
 * Pairing spins, finding trades and grouping batches all happen in memory on
 * the neighbourhood.
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
    params,
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

  const kept = candidates
    .filter((c) => matchesInMemory(params, c, context))
    .slice(0, PER_PAGE);
  const listed = rowTransfers(
    kept,
    chains,
    context.rewardIds,
    /**
     * Only transfers in a kept candidate's chain are looked up, and those
     * already match its type branch and, on the spin address, its month.
     */
    new Set(
      neighbourhood
        .filter(
          (t) =>
            t.transfer.inCollections && matchesInMemory(params, t, context),
        )
        .map((t) => t.transfer.id),
    ),
  );

  // only what the page displays needs its objekt
  const chained = chainedIds(addr, listed, chains);
  const wanted = new Set([
    ...listed.map((t) => t.transfer.id),
    ...listed.flatMap((t) => pairs.get(t.transfer.id) ?? []),
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

  return {
    results: groupTransfers({
      address: addr,
      page: listed.flatMap((t) => loaded.get(t.transfer.id) ?? []),
      rewards: new Map(
        [...pairs].flatMap(([spinId, rewardId]) => {
          const reward = loaded.get(rewardId);
          return reward ? [[spinId, reward] as const] : [];
        }),
      ),
      related: [...chained].flatMap((id) => loaded.get(id) ?? []),
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
 * scan per window and address index, in one statement. The candidates' chains
 * are then made whole, so every page groups a chain the same way.
 */
async function fetchNeighbourhood(
  address: string,
  candidates: ChainItem[],
  params: Payload,
  reach: number,
): Promise<{ transfer: Nearby }[]> {
  const windows = timeWindows(candidates, reach);
  const [first, second, ...rest] = windows.flatMap(({ lo, hi }) =>
    [transfers.from, transfers.to].map((column) =>
      nearbyQuery(
        params,
        and(
          eq(column, address),
          gte(transfers.timestamp, new Date(lo).toISOString()),
          lte(transfers.timestamp, new Date(hi).toISOString()),
        ),
      ),
    ),
  );
  if (!first) return [];
  // a transfer to yourself shows up from both sides
  const nearby = uniqueItems(
    second ? await unionAll(first, second, ...rest) : await first,
  );

  // with no reach every chain looks unfinished, and there are no trades to find
  const unfinished =
    reach > 0
      ? unfinishedChains(
          address,
          candidates,
          chainTransfers(address, nearby),
          windows,
        )
      : [];
  if (unfinished.length === 0) return nearby;

  // the rest of a chain overlaps the windows
  return uniqueItems([
    ...nearby.map((t) => t.transfer),
    ...(await fetchChainRest(address, params, unfinished)),
  ]);
}

/**
 * The rest of chains that run past the windows, as one statement. A walk
 * from each end of a chain steps to the furthest transfer between the pair
 * within TRADE_GAP_MS until there is none, then the pair's transfers between
 * where the walks stopped are read. Every probe and read is an index-only
 * range scan of a sender's address index.
 */
async function fetchChainRest(
  address: string,
  params: Payload,
  chains: ReturnType<typeof unfinishedChains>,
): Promise<Nearby[]> {
  const ts = transfers.timestamp;
  const gap = sql`${`${TRADE_GAP_MS} milliseconds`}::interval`;
  const timestamptz = (ms: number) =>
    sql`${new Date(ms).toISOString()}::timestamptz`;

  // each step probes both senders for the pair's furthest transfer in range
  const walk = (direction: "older" | "newer") => {
    const name = sql.raw(direction);
    const [start, range, order] =
      direction === "older"
        ? [
            sql`oldest`,
            sql`${ts} >= older.at - ${gap} and ${ts} < older.at`,
            sql`asc`,
          ]
        : [
            sql`newest`,
            sql`${ts} > newer.at and ${ts} <= newer.at + ${gap}`,
            sql`desc`,
          ];
    return sql`${name}(n, counterparty, at) as (
      select n, counterparty, ${start} from chain
      union all
      select ${name}.n, ${name}.counterparty, step.at from ${name}
      cross join lateral (
        (select ${ts} as at from ${transfers}
          where ${transfers.from} = ${address} and ${transfers.to} = ${name}.counterparty and ${range}
          order by ${ts} ${order} limit 1)
        union all
        (select ${ts} from ${transfers}
          where ${transfers.from} = ${name}.counterparty and ${transfers.to} = ${address} and ${range}
          order by ${ts} ${order} limit 1)
        order by at ${order} limit 1
      ) step
    )`;
  };

  const span = indexer.$with("span", {
    counterparty: sql<string>`counterparty`.as("counterparty"),
    lo: sql<string>`lo`.as("lo"),
    hi: sql<string>`hi`.as("hi"),
  }).as(sql`
      with recursive
        chain(n, counterparty, oldest, newest) as (
          values ${sql.join(
            chains.map(
              ({ counterparty, oldest, newest }, n) =>
                sql`(${n}::int, ${counterparty}, ${timestamptz(oldest)}, ${timestamptz(newest)})`,
            ),
            sql`, `,
          )}
        ),
        ${walk("older")},
        ${walk("newer")}
      select counterparty, min(at) as lo, max(at) as hi
      from (select * from older union all select * from newer) ends
      group by n, counterparty
    `);

  const sent = (
    from: string | SQL.Aliased<string>,
    to: string | SQL.Aliased<string>,
  ) =>
    nearbyQuery(
      params,
      and(
        eq(transfers.from, from),
        eq(transfers.to, to),
        between(ts, span.lo, span.hi),
      ),
    );
  const pair = unionAll(
    sent(address, span.counterparty),
    sent(span.counterparty, address),
  ).as("pair");

  return indexer
    .with(span)
    .select({
      id: pair.id,
      timestamp: pair.timestamp,
      from: pair.from,
      to: pair.to,
      inCollections: pair.inCollections,
    })
    .from(span)
    .crossJoinLateral(pair);
}

/**
 * The owner's transfers matching `where`, each flagged with whether its
 * collection passes the collection filters. Only an unfiltered read skips
 * the collection, staying index-only.
 */
function nearbyQuery(params: Payload, where: SQL | undefined) {
  const byCollection = collectionFilters(params);

  return byCollection.length > 0
    ? indexer
        .select({
          ...candidateColumns,
          inCollections:
            sql<boolean>`coalesce(${and(...byCollection)}, false)`.as(
              "in_collections",
            ),
        })
        .from(transfers)
        .leftJoin(collections, eq(transfers.collectionId, collections.id))
        .where(where)
    : indexer
        .select({
          ...candidateColumns,
          inCollections: sql<boolean>`true`.as("in_collections"),
        })
        .from(transfers)
        .where(where);
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

  return merged;
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

function toItems<T extends Candidate>(rows: T[]) {
  return rows.map((transfer) => ({ transfer }));
}

function uniqueItems<T extends Candidate>(rows: T[]) {
  return toItems([...new Map(rows.map((r) => [r.id, r] as const)).values()]);
}
