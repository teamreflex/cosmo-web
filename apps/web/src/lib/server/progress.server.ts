import { indexer } from "@/lib/server/db/indexer";
import type { Collection } from "@/lib/server/db/indexer/schema";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import type { ValidOnlineType } from "@apollo/cosmo/types/common";
import { Addresses } from "@apollo/util";
import { and, desc, eq, inArray, not, notInArray, sql } from "drizzle-orm";
import { unobtainables } from "../unobtainables";

type FetchTotal = {
  member: string;
  onlineType?: ValidOnlineType | null;
  season?: string | null;
};

/**
 * Fetch all collections for the given member.
 */
export async function fetchTotal({
  member,
  onlineType = null,
  season = null,
}: FetchTotal): Promise<Collection[]> {
  const result = await indexer
    .select()
    .from(collections)
    .where(
      and(
        eq(collections.member, member),
        notInArray(collections.class, ["Welcome", "Zero"]),
        ...(onlineType !== null ? [eq(collections.onOffline, onlineType)] : []),
        ...(season !== null ? [eq(collections.season, season)] : []),
      ),
    )
    .orderBy(desc(collections.createdAt));

  return result;
}

/**
 * Fetch unique collections the user owns for given member.
 */
export async function fetchProgress(address: string, member: string) {
  return await indexer
    // ensure we only count each collection once
    .selectDistinctOn([objekts.collectionId], {
      slug: collections.slug,
      owner: objekts.owner,
      collectionId: objekts.collectionId,
      member: collections.member,
      season: collections.season,
      class: collections.class,
      onOffline: collections.onOffline,
    })
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(
      and(
        // only operate on objekts the address owns
        eq(objekts.owner, address),
        // only operate on objekts of the given member
        eq(collections.member, member),
      ),
    )
    .orderBy(objekts.collectionId);
}

type FetchLeaderboard = {
  member: string;
  onlineType: ValidOnlineType | null;
  season: string | null;
};

const LEADERBOARD_COUNT = 25;

/**
 * Fetch top 25 for the given member.
 * TODO: optimize or refactor, it's blowing up the db
 */
export async function fetchLeaderboard({
  member,
  onlineType,
  season,
}: FetchLeaderboard) {
  const collectionIds = (
    await indexer
      .select({ id: collections.id })
      .from(collections)
      .where(
        and(
          eq(collections.member, member),
          notInArray(collections.class, ["Welcome", "Zero"]),
          notInArray(collections.slug, unobtainables),
          ...(onlineType !== null
            ? [eq(collections.onOffline, onlineType)]
            : []),
          ...(season !== null ? [eq(collections.season, season)] : []),
        ),
      )
  ).map((c) => c.id);

  if (collectionIds.length === 0) return [];

  const distinctPairs = indexer
    .select({
      owner: objekts.owner,
      collectionId: objekts.collectionId,
    })
    .from(objekts)
    .where(
      and(
        not(eq(objekts.owner, Addresses.SPIN)),
        inArray(objekts.collectionId, collectionIds),
      ),
    )
    .groupBy(objekts.owner, objekts.collectionId)
    .as("distinct_pairs");

  return await indexer
    .select({
      owner: distinctPairs.owner,
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(distinctPairs)
    .groupBy(distinctPairs.owner)
    .orderBy(sql`count desc`)
    .limit(LEADERBOARD_COUNT);
}
