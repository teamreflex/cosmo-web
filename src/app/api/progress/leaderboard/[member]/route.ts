import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import { and, count, eq, inArray, not, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { fetchTotal } from "../../common";
import { fetchKnownAddresses } from "@/lib/server/profiles";
import { addrcomp } from "@/lib/utils";
import { LeaderboardItem } from "@/lib/universal/progress";
import { unstable_cache } from "next/cache";
import { profiles } from "@/lib/server/db/schema";
import { ValidOnlineType } from "@/lib/universal/cosmo/common";
import { cacheHeaders } from "@/app/api/common";

export const runtime = "nodejs";
const LEADERBOARD_COUNT = 25;

type Params = {
  params: {
    member: string;
  };
};

/**
 * API route that services the progress leaderboard component.
 * Takes a member name, and returns the progress leaderboard for that member.
 * Cached for 1 hour.
 */
export async function GET(request: NextRequest, { params }: Params) {
  // parse search params
  const param = request.nextUrl.searchParams.get("onlineType");
  const onlineType = isOnlineType(param) ? param : null;

  const [totals, leaderboard] = await Promise.all([
    fetchTotal(params.member, onlineType),
    fetchLeaderboard(params.member, onlineType),
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

  return Response.json(
    {
      total: totals.length,
      leaderboard: results,
    },
    {
      headers: cacheHeaders(60 * 60),
    }
  );
}

/**
 * Fetch top 25 for the given member.
 */
async function fetchLeaderboard(
  member: string,
  onlineType: ValidOnlineType | null
) {
  const subquery = indexer
    .selectDistinctOn([objekts.owner, objekts.collectionId], {
      owner: objekts.owner,
      collectionId: objekts.collectionId,
    })
    .from(objekts)
    .leftJoin(collections, eq(objekts.collectionId, collections.id))
    .where(
      and(
        eq(collections.member, member),
        not(inArray(collections.class, ["Welcome", "Zero"])),
        ...(onlineType !== null ? [eq(collections.onOffline, onlineType)] : [])
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
    .limit(LEADERBOARD_COUNT);
}

/**
 * OnlineType type guard.
 */
function isOnlineType(type: string | null): type is ValidOnlineType {
  return type === "online" || type === "offline";
}
