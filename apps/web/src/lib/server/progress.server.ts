import { indexer } from "@/lib/server/db/indexer";
import type { Collection } from "@/lib/server/db/indexer/schema";
import {
  collectionOwners,
  collections,
  progressLeaderboard,
} from "@/lib/server/db/indexer/schema";
import type { ValidOnlineType } from "@apollo/cosmo/types/common";
import { and, asc, desc, eq, notInArray } from "drizzle-orm";

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
    .comment({ fn: "fetchTotal" });

  return result;
}

/**
 * Fetch unique collections the user owns for given member.
 * collection_owner excludes SPIN, whose progress isn't supported.
 */
export async function fetchProgress(address: string, member: string) {
  return await indexer
    .select({
      slug: collections.slug,
      owner: collectionOwners.owner,
      collectionId: collectionOwners.collectionId,
      member: collections.member,
      season: collections.season,
      class: collections.class,
      onOffline: collections.onOffline,
      unobtainable: collections.unobtainable,
    })
    .from(collectionOwners)
    .innerJoin(collections, eq(collectionOwners.collectionId, collections.id))
    .where(
      and(eq(collectionOwners.owner, address), eq(collections.member, member)),
    )
    .orderBy(collectionOwners.collectionId)
    .comment({ fn: "fetchProgress" });
}

type FetchLeaderboard = {
  member: string;
  onlineType: ValidOnlineType | null;
  season: string | null;
};

const LEADERBOARD_COUNT = 25;

/**
 * Fetch the top 25 owners of distinct obtainable collections for the given member,
 * read from the trigger-maintained leaderboard. Ties are ordered by address so the
 * ranking stays stable between requests.
 */
export async function fetchLeaderboard({
  member,
  onlineType,
  season,
}: FetchLeaderboard) {
  return await indexer
    .select({
      owner: progressLeaderboard.owner,
      count: progressLeaderboard.count,
    })
    .from(progressLeaderboard)
    .where(
      and(
        eq(progressLeaderboard.member, member),
        // an empty season or onOffline row is the total across all of them
        eq(progressLeaderboard.season, season ?? ""),
        eq(progressLeaderboard.onOffline, onlineType ?? ""),
      ),
    )
    .orderBy(desc(progressLeaderboard.count), asc(progressLeaderboard.owner))
    .limit(LEADERBOARD_COUNT)
    .comment({ fn: "fetchLeaderboard" });
}
