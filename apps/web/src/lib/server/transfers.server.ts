import type { transfersBackendSchema } from "@/lib/universal/parsers";
import { Addresses, isEqual } from "@apollo/util";
import { and, desc, eq, inArray, not, or, type SQL, sql } from "drizzle-orm";
import type { z } from "zod";
import type { TransferResult, TransferType } from "../universal/transfers";
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
type Payload = z.infer<typeof transfersBackendSchema>;

/**
 * Fetch transfers from the indexer by address.
 */
export async function fetchTransferRows(
  address: string,
  params: Payload,
): Promise<TransferResult> {
  const cursor = decodeCursor(params.cursor);
  const isSpin = isEqual(address, Addresses.SPIN);
  const extraFilters = withSpinMonth(isSpin, transfers.timestamp);
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
}

/**
 * Filter transfers by type.
 */
function withType(address: string, type: TransferType) {
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
        sql`(${transfers.timestamp}, ${transfers.id}) < (${cursor.timestamp}::timestamptz, ${cursor.id})`,
      ]
    : [];
}

type IdsQuery = ReturnType<typeof buildIdsQuery>;

/**
 * Newest transfer ids matching a direction filter. The timestamp rides along
 * so two directions can be unioned and ordered without joining anything.
 */
function buildIdsQuery(
  baseFilter: SQL | undefined,
  params: Payload,
  cursor: ReturnType<typeof decodeCursor>,
  extraFilters: SQL[],
) {
  return indexer
    .select({ id: transfers.id, timestamp: transfers.timestamp })
    .from(transfers)
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
 * Join a page of transfer ids back to their transfer, objekt and collection rows.
 */
function fetchPage(ft: ReturnType<IdsQuery["as"]>, tag: string) {
  return indexer
    .select({
      transfer: transfers,
      serial: objekts.serial,
      collection: collections,
      isSpin: sql<boolean>`${transfers.to} = ${Addresses.SPIN}`,
    })
    .from(ft)
    .innerJoin(transfers, eq(transfers.id, ft.id))
    .leftJoin(objekts, eq(transfers.objektId, objekts.id))
    .leftJoin(collections, eq(transfers.collectionId, collections.id))
    .orderBy(desc(transfers.timestamp), desc(transfers.id))
    .limit(PER_PAGE)
    .comment({ fn: tag });
}

/**
 * Fetch transfers for `type=all`. An OR across from/to can't walk either
 * address index, so each direction walks its own index for a page of ids and
 * the union is ordered and cut to one page before the row joins run once.
 * `union` (not `union all`) drops the duplicate a self-transfer would produce.
 */
async function fetchSplitAll(
  address: string,
  params: Payload,
  cursor: ReturnType<typeof decodeCursor>,
  extraFilters: SQL[],
) {
  const ids = buildIdsQuery(
    eq(transfers.from, address),
    params,
    cursor,
    extraFilters,
  )
    .union(
      buildIdsQuery(eq(transfers.to, address), params, cursor, extraFilters),
    )
    .orderBy(desc(transfers.timestamp), desc(transfers.id))
    .limit(PER_PAGE)
    .as("ft");

  return await fetchPage(ids, "fetchSplitAll");
}

/**
 * Fetch transfers for non-`all` types, where a single direction filter applies.
 */
async function fetchTransferFirst(
  address: string,
  params: Payload,
  cursor: ReturnType<typeof decodeCursor>,
  extraFilters: SQL[],
) {
  const ids = buildIdsQuery(
    withType(address, params.type ?? "all"),
    params,
    cursor,
    extraFilters,
  ).as("ft");

  return await fetchPage(ids, "fetchTransferFirst");
}
