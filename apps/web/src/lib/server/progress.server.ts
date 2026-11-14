import { indexer } from "@/lib/server/db/indexer";
import type { ValidOnlineType } from "@apollo/cosmo/types/common";
import {
  collectionOwners,
  collections,
  progressLeaderboard,
} from "@apollo/database/indexer/schema";
import type { Collection } from "@apollo/database/indexer/types";
import { and, asc, count, desc, eq, notInArray } from "drizzle-orm";

// the member's collections that progress counts: every class but Welcome and Zero, as progress_leaderboard does
const progressCollections = (member: string) =>
  and(
    eq(collections.member, member),
    notInArray(collections.class, ["Welcome", "Zero"]),
  );

/**
 * Fetch all collections for the given member.
 */
export async function fetchTotal(member: string): Promise<Collection[]> {
  return await indexer
    .select()
    .from(collections)
    .where(progressCollections(member))
    .comment({ fn: "fetchTotal" });
}

type FetchLeaderboard = {
  member: string;
  onlineType: ValidOnlineType | null;
  season: string | null;
};

/**
 * Count the member's obtainable collections for the given filters.
 */
export async function countObtainable({
  member,
  onlineType,
  season,
}: FetchLeaderboard) {
  const [row] = await indexer
    .select({ total: count() })
    .from(collections)
    .where(
      and(
        progressCollections(member),
        eq(collections.unobtainable, false),
        ...(onlineType !== null ? [eq(collections.onOffline, onlineType)] : []),
        ...(season !== null ? [eq(collections.season, season)] : []),
      ),
    )
    .comment({ fn: "countObtainable" });

  return row?.total ?? 0;
}

/**
 * Fetch the ids of the member's collections the user owns.
 * collection_owner excludes SPIN, whose progress isn't supported.
 */
export async function fetchProgress(address: string, member: string) {
  return await indexer
    .select({ collectionId: collectionOwners.collectionId })
    .from(collectionOwners)
    .innerJoin(collections, eq(collectionOwners.collectionId, collections.id))
    .where(
      and(eq(collectionOwners.owner, address), eq(collections.member, member)),
    )
    .comment({ fn: "fetchProgress" });
}

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
