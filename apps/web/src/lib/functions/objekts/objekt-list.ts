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
  mintCount,
  withArtist,
  withClass,
  withMember,
  withOnlineType,
  withSeason,
} from "@/lib/server/objekts/filters.server";
import { objektListBackendSchema } from "@/lib/universal/parsers";
import {
  isMemberSort,
  isMintSort,
  type ValidSort,
} from "@apollo/cosmo/types/common";
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
  medianPriceUsd: number | null;
  listingCount: number;
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
 * card per serial.
 */
export const $fetchObjektListEntries = createServerFn({ method: "GET" })
  .validator(
    objektListBackendSchema.extend({
      objektListId: z.uuid(),
    }),
  )
  .handler(async ({ data }): Promise<FetchObjektListEntries> => {
    const entries = await db.query.objektListEntries.findMany({
      where: { objektListId: data.objektListId },
      columns: {
        id: true,
        collectionId: true,
        tokenId: true,
        quantity: true,
        price: true,
        createdAt: true,
      },
      with: {
        priceStats: {
          columns: {
            medianPriceUsd: true,
            listingCount: true,
          },
        },
      },
    });

    if (entries.length === 0) {
      return {
        total: 0,
        hasNext: false,
        nextStartAfter: undefined,
        objekts: [],
      };
    }

    const sort = data.sort ?? "newest";
    const start = data.page * LIMIT;
    const rows = await fetchListPage(entries, data, sort, start);

    const entriesById = new Map(entries.map((e) => [e.id, e]));
    const items: ObjektListItem[] = [];
    for (const row of rows) {
      const entry = entriesById.get(row.entryId);
      if (!entry) continue;
      items.push({
        ...row.collection,
        id: entry.id,
        entryQuantity: entry.quantity,
        entryPrice: entry.price,
        entryTokenId: entry.tokenId,
        entrySerial: row.serial,
        entryCreatedAt: entry.createdAt.toISOString(),
        medianPriceUsd: entry.priceStats?.medianPriceUsd ?? null,
        listingCount: entry.priceStats?.listingCount ?? 0,
      });
    }

    const total = rows[0]?.total ?? 0;
    const hasNext = start + LIMIT < total;

    return {
      total,
      hasNext,
      nextStartAfter: hasNext ? data.page + 1 : undefined,
      objekts: items,
    };
  });

type ListEntry = {
  id: string;
  collectionId: string;
  tokenId: string | null;
  createdAt: Date;
};

/**
 * Fetch one page of list entries from the indexer. Entries live in the web
 * database, so they're passed in as a JSON recordset; the indexer then applies
 * the collection filters, sorts and pages them, and joins the collection and
 * serial for just the page's rows.
 */
async function fetchListPage(
  entries: ListEntry[],
  data: z.infer<typeof objektListBackendSchema>,
  sort: ValidSort,
  start: number,
) {
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

  const order = listSortOrder(sort, listEntries.createdAt);
  let pageQuery = indexer
    .with(listEntries)
    .select({
      entryId: listEntries.entryId,
      tokenId: listEntries.tokenId,
      collectionId: collections.id,
      position:
        sql<number>`row_number() over (order by ${sql.join([...order, sql`${listEntries.entryId}`], sql`, `)})`.as(
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
 * between entries of the same collection the same way. Sorts that don't apply
 * to lists fall back to newest.
 */
function listSortOrder(sort: ValidSort, addedAt: SQL.Aliased<string>): SQL[] {
  const newestAdded = sql`${addedAt} desc`;
  switch (sort) {
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
      return [sql`${mintCount} asc nulls last`, newestAdded];
    case "mintsDesc":
      return [sql`${mintCount} desc nulls last`, newestAdded];
    default:
      return [newestAdded];
  }
}
