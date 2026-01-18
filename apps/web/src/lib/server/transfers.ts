import { transfersBackendSchema } from "@/lib/universal/parsers";
import { Addresses, isEqual } from "@apollo/util";
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import {
  and,
  desc,
  eq,
  gte,
  inArray,
  lt,
  not,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import type { z } from "zod";
import type { TransferResult, TransferType } from "../universal/transfers";
import { fetchKnownAddresses } from "./cosmo-accounts";
import { indexer } from "./db/indexer";
import { collections, objekts, transfers } from "./db/indexer/schema";
import {
  withArtist,
  withClass,
  withMember,
  withOnlineType,
  withSeason,
  withSelectedArtists,
} from "./objekts/filters";

const PER_PAGE = 60;
type Payload = z.infer<typeof transfersBackendSchema>;

/**
 * Fetches transfers and zips known nicknames into the results.
 */
export const $fetchTransfers = createServerFn({ method: "GET" })
  .inputValidator(transfersBackendSchema)
  .handler(async ({ data }): Promise<TransferResult> => {
    // too much data, bail
    if (isEqual(data.address, Addresses.NULL)) {
      return {
        results: [],
        cursor: undefined,
      };
    }

    const aggregate = await fetchTransferRows(data.address, data);
    const addresses = aggregate.results
      .flatMap((r) => [r.transfer.from, r.transfer.to])
      // can't send to yourself, so filter out the current address
      .filter((a) => a !== data.address.toLowerCase());

    const addressMap = await fetchKnownAddresses(addresses);

    return {
      ...aggregate,
      // map the nickname onto the results and apply spin flags
      results: aggregate.results.map((row) => {
        const fromAddress = row.transfer.from.toLowerCase();
        const toAddress = row.transfer.to.toLowerCase();
        return {
          ...row,
          username:
            addressMap.get(fromAddress)?.username ??
            addressMap.get(toAddress)?.username,
        };
      }),
    };
  });

/**
 * Fetch transfers from the indexer by address.
 */
const fetchTransferRows = createServerOnlyFn(
  async (address: string, params: Payload): Promise<TransferResult> => {
    const cursor = decodeCursor(params.cursor);
    const isSpin = isEqual(address, Addresses.SPIN);
    const extraFilters = isSpin ? spinMonthFilter() : [];
    const addr = address.toLowerCase();

    const results =
      params.type === "all"
        ? await fetchSplitAll(addr, params, cursor, extraFilters)
        : await fetchTransferFirst(addr, params, cursor, extraFilters);

    const lastResult = results[results.length - 1];
    return {
      results,
      cursor:
        results.length === PER_PAGE && lastResult
          ? encodeCursor(lastResult.transfer.timestamp, lastResult.transfer.id)
          : undefined,
    };
  },
);

/**
 * Filter transfers by type.
 */
const withType = createServerOnlyFn((address: string, type: TransferType) => {
  switch (type) {
    // address must be either a sender or receiver
    case "all":
      return or(eq(transfers.from, address), eq(transfers.to, address));
    // address must be a receiver while the sender is the burn address/cosmo
    case "mint":
      return and(eq(transfers.from, Addresses.NULL), eq(transfers.to, address));
    // address must be a receiver from non-burn address
    case "received":
      return and(
        not(eq(transfers.from, Addresses.NULL)),
        eq(transfers.to, address),
      );
    // address must be a sender to non-burn address
    case "sent":
      return and(
        not(inArray(transfers.to, [Addresses.NULL, Addresses.SPIN])),
        eq(transfers.from, address),
      );
    // address must be a sender to the spin address
    case "spin":
      return and(eq(transfers.to, Addresses.SPIN), eq(transfers.from, address));
  }
});

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

/**
 * Build the filter for the spin account to only query the last month of transfers.
 */
function spinMonthFilter() {
  return [gte(transfers.timestamp, sql`now() - interval '1 month'`)];
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
 * Build the filters for the cursor.
 */
function cursorFilters(cursor: ReturnType<typeof decodeCursor>) {
  return cursor
    ? [
        or(
          lt(transfers.timestamp, cursor.timestamp),
          and(
            eq(transfers.timestamp, cursor.timestamp),
            lt(transfers.id, cursor.id),
          ),
        ),
      ]
    : [];
}

/**
 * Build the base query for fetching transfers.
 */
function buildBaseQuery(
  baseFilter: SQL | undefined,
  params: Payload,
  cursor: ReturnType<typeof decodeCursor>,
  extraFilters: SQL[],
) {
  return indexer
    .select({
      transfer: transfers,
      serial: objekts.serial,
      collection: collections,
      isSpin: sql<boolean>`${transfers.to} = ${Addresses.SPIN}`,
    })
    .from(transfers)
    .leftJoin(objekts, eq(transfers.objektId, objekts.id))
    .leftJoin(collections, eq(transfers.collectionId, collections.id))
    .where(
      and(
        baseFilter,
        ...cursorFilters(cursor),
        ...collectionFilters(params),
        ...extraFilters,
      ),
    )
    .orderBy(desc(transfers.timestamp), desc(transfers.id))
    .limit(PER_PAGE);
}

/**
 * Fetch transfers for `type=all` by splitting into two indexed queries.
 * Avoids an OR on (from/to) by running one query per column, then merges,
 * de-dupes, and sorts the combined rows in memory before applying the page limit.
 */
async function fetchSplitAll(
  address: string,
  params: Payload,
  cursor: ReturnType<typeof decodeCursor>,
  extraFilters: SQL[],
) {
  const [fromRows, toRows] = await Promise.all([
    buildBaseQuery(eq(transfers.from, address), params, cursor, extraFilters),
    buildBaseQuery(eq(transfers.to, address), params, cursor, extraFilters),
  ]);

  const seen = new Set<string>();
  const combined = [...fromRows, ...toRows].filter((row) => {
    if (seen.has(row.transfer.id)) return false;
    seen.add(row.transfer.id);
    return true;
  });

  combined.sort((a, b) => {
    if (a.transfer.timestamp === b.transfer.timestamp) {
      return a.transfer.id > b.transfer.id ? -1 : 1;
    }
    return a.transfer.timestamp > b.transfer.timestamp ? -1 : 1;
  });

  return combined.slice(0, PER_PAGE);
}

/**
 * Fetch transfers for non-`all` types using a transfer-first subquery.
 * Limits to the newest transfer IDs first, then joins to objekts/collections,
 * reducing work on heavy joins when only a single transfer direction applies.
 */
async function fetchTransferFirst(
  address: string,
  params: Payload,
  cursor: ReturnType<typeof decodeCursor>,
  extraFilters: SQL[],
) {
  const filteredTransfers = indexer
    .select({ id: transfers.id })
    .from(transfers)
    .leftJoin(collections, eq(transfers.collectionId, collections.id))
    .where(
      and(
        withType(address, params.type ?? "all"),
        ...cursorFilters(cursor),
        ...collectionFilters(params),
        ...extraFilters,
      ),
    )
    .orderBy(desc(transfers.timestamp), desc(transfers.id))
    .limit(PER_PAGE)
    .as("ft");

  return await indexer
    .select({
      transfer: transfers,
      serial: objekts.serial,
      collection: collections,
      isSpin: sql<boolean>`${transfers.to} = ${Addresses.SPIN}`,
    })
    .from(filteredTransfers)
    .innerJoin(transfers, eq(transfers.id, filteredTransfers.id))
    .leftJoin(objekts, eq(transfers.objektId, objekts.id))
    .leftJoin(collections, eq(transfers.collectionId, collections.id))
    .orderBy(desc(transfers.timestamp), desc(transfers.id))
    .limit(PER_PAGE);
}
