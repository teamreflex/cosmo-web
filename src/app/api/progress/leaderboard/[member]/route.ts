import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import { and, count, eq, inArray, not, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { fetchTotal } from "../../common";
import { fetchKnownAddresses } from "@/lib/server/profiles";
import { isAddressEqual } from "@/lib/utils";
import { LeaderboardItem } from "@/lib/universal/progress";
import { profiles } from "@/lib/server/db/schema";
import {
  ValidOnlineType,
  ValidSeason,
  validOnlineTypes,
  validSeasons,
} from "@/lib/universal/cosmo/common";
import { cacheHeaders } from "@/app/api/common";
import { z } from "zod";

export const runtime = "nodejs";
const LEADERBOARD_COUNT = 25;

const schema = z.object({
  member: z.string(),
  onlineType: z.preprocess(
    (v) => (v === "" ? null : v),
    z.enum(validOnlineTypes).nullable()
  ),
  season: z.preprocess(
    (v) => (v === "" ? null : v),
    z.enum(validSeasons).nullable()
  ),
});

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
  const result = schema.safeParse({
    member: params.member,
    ...Object.fromEntries(request.nextUrl.searchParams.entries()),
  });

  // use fallbacks if parsing fails
  const options = result.success
    ? result.data
    : {
        member: params.member,
        onlineType: null,
        season: null,
      };

  const [totals, leaderboard] = await Promise.all([
    fetchTotal(options),
    fetchLeaderboard(options),
  ]);

  // fetch profiles for each address
  const knownAddresses = await fetchKnownAddresses(
    leaderboard.map((a) => a.owner),
    [eq(profiles.privacyNickname, false)]
  );

  // map the nickname onto the results
  const results = leaderboard.map((row) => {
    const known = knownAddresses.find((a) =>
      isAddressEqual(a.userAddress, row.owner)
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

type FetchLeaderboard = {
  member: string;
  onlineType: ValidOnlineType | null;
  season: ValidSeason | null;
};

/**
 * Fetch top 25 for the given member.
 */
async function fetchLeaderboard({
  member,
  onlineType,
  season,
}: FetchLeaderboard) {
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
        ...(onlineType !== null ? [eq(collections.onOffline, onlineType)] : []),
        ...(season !== null ? [eq(collections.season, season)] : [])
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
