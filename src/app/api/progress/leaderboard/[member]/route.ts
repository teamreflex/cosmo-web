import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import { and, count, eq, inArray, not, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { fetchTotal } from "../../common";
import { fetchKnownAddresses } from "@/lib/server/profiles";
import { addrcomp } from "@/lib/utils";
import { LeaderboardItem } from "@/lib/universal/progress";
import { unstable_cache } from "next/cache";
import { profiles } from "@/lib/server/db/schema";

export const runtime = "nodejs";

type Params = {
  params: {
    member: string;
  };
};

/**
 * API route that services the progress leaderboard component.
 * Takes a member name, and returns the progress leaderboard for that member.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const [totals, leaderboard] = await Promise.all([
    fetchTotal(params.member),
    fetchLeaderboard(params.member),
  ]);

  // fetch profiles for each address
  const knownAddresses = await fetchKnownAddresses(
    leaderboard.map((a) => a.owner),
    [eq(profiles.privacyNickname, false)]
  );

  // map the nickname onto the results
  const results = leaderboard.map((row) => {
    const known = knownAddresses.find((a) =>
      addrcomp(a.userAddress, row.owner)
    );

    return {
      count: row.count,
      nickname: known?.nickname ?? row.owner.substring(0, 8),
      address: row.owner,
      isAddress: known === undefined,
    };
  }) satisfies LeaderboardItem[];

  return NextResponse.json({
    total: totals.length,
    leaderboard: results,
  });
}

/**
 * Fetch top 10 for the given member.
 * Cached for 1 hour.
 */
const fetchLeaderboard = unstable_cache(
  async (member: string) => {
    const subquery = indexer
      .select({
        owner: objekts.owner,
        collectionId: objekts.collectionId,
      })
      .from(objekts)
      .leftJoin(collections, eq(objekts.collectionId, collections.id))
      .where(
        and(
          eq(collections.member, member),
          not(inArray(collections.class, ["Welcome", "Zero"]))
        )
      )
      .groupBy(objekts.owner, objekts.collectionId)
      .as("subquery");

    return await indexer
      .select({
        owner: subquery.owner,
        count: count(subquery.collectionId).as("count"),
      })
      .from(subquery)
      .groupBy(subquery.owner)
      .orderBy(sql`count desc`)
      .limit(10);
  },
  ["progress-leaderboard"], // param (member name) gets added to this
  { revalidate: 60 * 60 } // 1 hour
);
