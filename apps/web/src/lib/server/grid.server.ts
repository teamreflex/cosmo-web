import { remember } from "@/lib/server/cache.server";
import { indexer } from "@/lib/server/db/indexer";
import { collections, members, objekts } from "@/lib/server/db/indexer/schema";
import type {
  GridCatalogRow,
  GridMemberRef,
  GridOwnedRow,
  GridOwnedToken,
} from "@/lib/universal/grid";
import { sourceClassFor } from "@/lib/universal/grid";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import { and, count, eq, inArray } from "drizzle-orm";

/**
 * The collection classes the grid ledger consumes for the given artist.
 * tripleS Unit collections are a different mechanic and never fetched.
 */
function gridClasses(artist: ValidArtist) {
  return artist === "idntt"
    ? ["Basic", "Special", "Unit"]
    : ["First", "Special"];
}

/**
 * Fetch the grid-relevant collection catalog for an artist.
 * User-independent, so cached for an hour.
 */
export async function fetchGridCatalog(
  artist: ValidArtist,
): Promise<GridCatalogRow[]> {
  return remember(`grid-catalog:v2:${artist}`, 60 * 60, () =>
    indexer
      .select({
        season: collections.season,
        member: collections.member,
        class: collections.class,
        collectionNo: collections.collectionNo,
        slug: collections.slug,
        thumbnailImage: collections.thumbnailImage,
      })
      .from(collections)
      .where(
        and(
          eq(collections.artist, artist.toLowerCase()),
          inArray(collections.class, gridClasses(artist)),
        ),
      ),
  );
}

/**
 * Fetch per-collection ownership counts of grid-relevant objekts, split by transferability.
 */
export async function fetchOwnedGridCounts(
  address: string,
  artist: ValidArtist,
): Promise<GridOwnedRow[]> {
  return indexer
    .select({
      season: collections.season,
      member: collections.member,
      class: collections.class,
      collectionNo: collections.collectionNo,
      transferable: objekts.transferable,
      count: count(),
    })
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(
      and(
        eq(objekts.owner, address.toLowerCase()),
        eq(collections.artist, artist.toLowerCase()),
        inArray(collections.class, gridClasses(artist)),
      ),
    )
    .groupBy(
      collections.season,
      collections.member,
      collections.class,
      collections.collectionNo,
      objekts.transferable,
    );
}

/**
 * Fetch the individual non-transferable source-class tokens owned by the
 * address, for the view-local "include non-transferable" toggle.
 */
export async function fetchNonTransferableGridTokens(
  address: string,
  artist: ValidArtist,
): Promise<GridOwnedToken[]> {
  return indexer
    .select({
      season: collections.season,
      member: collections.member,
      collectionNo: collections.collectionNo,
      tokenId: objekts.id,
      serial: objekts.serial,
    })
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(
      and(
        eq(objekts.owner, address.toLowerCase()),
        eq(objekts.transferable, false),
        eq(collections.artist, artist.toLowerCase()),
        eq(collections.class, sourceClassFor(artist)),
      ),
    );
}

/**
 * Fetch the canonical member references for an artist (sort order and the
 * alias used in idntt unit pair strings). Cached alongside the catalog.
 */
export async function fetchGridMembers(
  artist: ValidArtist,
): Promise<GridMemberRef[]> {
  return remember(`grid-members:${artist}`, 60 * 60, () =>
    indexer
      .select({
        name: members.name,
        alias: members.alias,
        sortOrder: members.sortOrder,
      })
      .from(members)
      .where(eq(members.artistId, artist)),
  );
}
