import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import {
  collections,
  collectionStats,
  members,
  objekts,
} from "@/lib/server/db/indexer/schema";
import type { Collection } from "@/lib/server/db/indexer/schema";
import {
  mintOrder,
  withArtist,
  withClass,
  withMember,
  withOnlineType,
  withSeason,
} from "@/lib/server/objekts/filters.server";
import { fetchLatestFxRate } from "@/lib/server/objekts/fx.server";
import {
  fetchMarketStats,
  isFloorPrice,
} from "@/lib/server/objekts/market.server";
import { objektListBackendSchema } from "@/lib/universal/parsers";
import {
  type IndexSort,
  indexSorts,
  supportedSort,
} from "@/lib/universal/sorts";
import { isMemberSort, isMintSort } from "@apollo/cosmo/types/common";
import type { ObjektListEntry } from "@apollo/database/web/types";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, type SQL, sql } from "drizzle-orm";
import * as z from "zod";

const LIMIT = 60;

export type ObjektListItem = Collection & {
  entryQuantity: number;
  entryPrice: number | null;
  entryTokenId: string | null;
  entrySerial: number | null;
  entryCreatedAt: string;
  // a priced sale serial at its collection's market floor
  entryAtFloor: boolean;
};

type FetchObjektListEntries = {
  total: number;
  hasNext: boolean;
  nextStartAfter: number | undefined;
  objekts: ObjektListItem[];
};

/**
 * Fetch list entries joined with their indexer collection (and serial, when
 * the entry is keyed to a specific token). Each entry produces its own card,
 * so a have list with multiple serials of the same collection renders one
 * card per serial. Sale list serials are flagged when they're at the market
 * floor of their collection.
 */
export const $fetchObjektListEntries = createServerFn({ method: "GET" })
  .validator(
    objektListBackendSchema.extend({
      objektListId: z.uuid(),
    }),
  )
  .handler(async ({ data }): Promise<FetchObjektListEntries> => {
    const list = await db.query.objektLists.findFirst({
      where: { id: data.objektListId },
      columns: { type: true, currency: true },
      with: {
        entries: {
          columns: {
            id: true,
            collectionId: true,
            tokenId: true,
            quantity: true,
            price: true,
            createdAt: true,
          },
        },
      },
    });

    if (list === undefined || list.entries.length === 0) {
      return {
        total: 0,
        hasNext: false,
        nextStartAfter: undefined,
        objekts: [],
      };
    }

    const start = data.page * LIMIT;
    // only sale lists whose currency has a rate can sit at the market floor
    const [rows, rateToUsd] = await Promise.all([
      fetchListPage(list.entries, data, start),
      list.type === "sale" && list.currency !== null
        ? fetchLatestFxRate(list.currency)
        : null,
    ]);

    const entriesById = new Map(list.entries.map((e) => [e.id, e]));
    const page = rows.flatMap((row) => {
      const entry = entriesById.get(row.entryId);
      return entry === undefined ? [] : [{ row, entry }];
    });
    const floors =
      rateToUsd === null
        ? new Set<string>()
        : await fetchFloors(
            page.map(({ entry }) => entry),
            rateToUsd,
          );

    const items = page.map(({ row, entry }): ObjektListItem => ({
      ...row.collection,
      id: entry.id,
      entryQuantity: entry.quantity,
      entryPrice: entry.price,
      entryTokenId: entry.tokenId,
      entrySerial: row.serial,
      entryCreatedAt: entry.createdAt.toISOString(),
      entryAtFloor: floors.has(entry.id),
    }));

    const total = rows[0]?.total ?? 0;
    const hasNext = start + LIMIT < total;

    return {
      total,
      hasNext,
      nextStartAfter: hasNext ? data.page + 1 : undefined,
      objekts: items,
    };
  });

/**
 * Ids of a page of sale list entries whose priced serials sit at their
 * collection's market floor, given the list currency's USD rate.
 */
async function fetchFloors(
  entries: Pick<ObjektListEntry, "id" | "collectionId" | "tokenId" | "price">[],
  rateToUsd: number,
) {
  const priced = entries.flatMap((e) =>
    e.tokenId !== null && e.price !== null ? [{ ...e, price: e.price }] : [],
  );
  const stats = await fetchMarketStats([
    ...new Set(priced.map((e) => e.collectionId)),
  ]);

  return new Set(
    priced
      .filter((e) =>
        isFloorPrice(e.price * rateToUsd, stats.get(e.collectionId)),
      )
      .map((e) => e.id),
  );
}

/**
 * Fetch one page of list entries from the indexer. Entries live in the web
 * database, so they're passed in as a JSON recordset; the indexer then applies
 * the collection filters, sorts and pages them, and joins the collection and
 * serial for just the page's rows.
 */
async function fetchListPage(
  entries: Pick<
    ObjektListEntry,
    "id" | "collectionId" | "tokenId" | "createdAt"
  >[],
  data: z.infer<typeof objektListBackendSchema>,
  start: number,
) {
  const sort = supportedSort(data.sort, indexSorts);
  const recordset = JSON.stringify(
    entries.map((e) => ({
      entry_id: e.id,
      slug: e.collectionId,
      token_id: e.tokenId,
      created_at: e.createdAt,
    })),
  );
  const listEntries = indexer.$with("list_entries").as(
    indexer
      .select({
        entryId: sql<string>`entry_id`.as("entry_id"),
        slug: sql<string>`slug`.as("slug"),
        tokenId: sql<string | null>`token_id`.as("token_id"),
        createdAt: sql<string>`created_at`.as("created_at"),
      })
      .from(
        sql`jsonb_to_recordset(${recordset}::text::jsonb) as e(entry_id uuid, slug text, token_id text, created_at timestamptz)`,
      ),
  );

  let pageQuery = indexer
    .with(listEntries)
    .select({
      entryId: listEntries.entryId,
      tokenId: listEntries.tokenId,
      collectionId: collections.id,
      position:
        sql<number>`row_number() over (order by ${sql.join([...listSortOrder(sort, listEntries.createdAt), sql`${listEntries.entryId}`], sql`, `)})`.as(
          "position",
        ),
      total: sql<number>`count(*) over ()::int`.as("total"),
    })
    .from(listEntries)
    .innerJoin(collections, eq(collections.slug, listEntries.slug))
    .where(
      and(
        ...withArtist(data.artist),
        ...withClass(data.class ?? []),
        ...withSeason(data.season ?? []),
        ...withOnlineType(data.on_offline ?? []),
        ...withMember(data.member),
      ),
    )
    .$dynamic();
  if (isMemberSort(sort)) {
    pageQuery = pageQuery.leftJoin(
      members,
      eq(members.name, collections.member),
    );
  }
  if (isMintSort(sort)) {
    pageQuery = pageQuery.leftJoin(
      collectionStats,
      eq(collectionStats.collectionId, collections.id),
    );
  }
  const page = pageQuery
    .orderBy(sql`position`)
    .limit(LIMIT)
    .offset(start)
    .as("page");

  return await indexer
    .select({
      entryId: page.entryId,
      total: page.total,
      serial: objekts.serial,
      collection: collections,
    })
    .from(page)
    .innerJoin(collections, eq(collections.id, page.collectionId))
    .leftJoin(objekts, eq(objekts.id, page.tokenId))
    .orderBy(page.position)
    .comment({ fn: "fetchObjektListPage" });
}

/**
 * Sort keys for list entries. Newest/oldest order by when the entry was added
 * to the list (not when the collection released), and other sorts break ties
 * between entries of the same collection the same way.
 */
function listSortOrder(sort: IndexSort, addedAt: SQL.Aliased<string>): SQL[] {
  const newestAdded = sql`${addedAt} desc`;
  switch (sort) {
    case "newest":
      return [newestAdded];
    case "oldest":
      return [sql`${addedAt} asc`];
    case "noAscending":
      return [sql`${collections.collectionNo} asc`, newestAdded];
    case "noDescending":
      return [sql`${collections.collectionNo} desc`, newestAdded];
    case "memberAsc":
      return [
        sql`${members.sortOrder} asc nulls last`,
        sql`${collections.collectionNo} asc`,
        newestAdded,
      ];
    case "memberDesc":
      return [
        sql`${members.sortOrder} desc nulls last`,
        sql`${collections.collectionNo} asc`,
        newestAdded,
      ];
    case "mintsAsc":
    case "mintsDesc":
      return [mintOrder(sort), newestAdded];
  }
}
