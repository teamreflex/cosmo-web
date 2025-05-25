import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import { and, count, eq, inArray, not, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { fetchTotal } from "../../common";
import { fetchKnownAddresses } from "@/lib/server/cosmo-accounts";
import { Addresses, isEqual } from "@/lib/utils";
import type { LeaderboardItem } from "@/lib/universal/progress";
import {
  type ValidOnlineType,
  validOnlineTypes,
} from "@/lib/universal/cosmo/common";
import { cacheHeaders } from "@/app/api/common";
import { z } from "zod/v4";
import { unobtainables } from "@/lib/unobtainables";

export const runtime = "nodejs";
const LEADERBOARD_COUNT = 25;

const schema = z.object({
  member: z.string(),
  onlineType: z.preprocess(
    (v) => (v === "" ? null : v),
    z.enum(validOnlineTypes).optional().nullable().default(null)
  ),
  season: z.string().optional().nullable().default(null),
});

type Params = {
  params: Promise<{
    member: string;
  }>;
};

/**
 * API route that services the progress leaderboard component.
 * Takes a member name, and returns the progress leaderboard for that member.
 * Cached for 1 hour.
 */
export async function GET(request: NextRequest, props: Params) {
  const params = await props.params;
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
    leaderboard.map((a) => a.owner)
  );

  // map the nickname onto the results
  const results = leaderboard.map((row) => {
    const known = knownAddresses.find((a) => isEqual(a.address, row.owner));

    return {
      count: row.count,
      nickname: known?.username ?? row.owner.substring(0, 8),
      address: row.owner,
      isAddress: known === undefined,
    };
  }) satisfies LeaderboardItem[];

  return Response.json(
    {
      total: totals.filter((c) => !unobtainables.includes(c.slug)).length,
      leaderboard: results,
    },
    {
      headers: cacheHeaders({ vercel: 60 * 60 }),
    }
  );
}

type FetchLeaderboard = {
  member: string;
  onlineType: ValidOnlineType | null;
  season: string | null;
};

/**
 * Fetch top 25 for the given member.
 */
async function fetchLeaderboard({
  member,
  onlineType,
  season,
}: FetchLeaderboard) {
  // cte 1: filter collections to apply filters
  const filteredCollections = indexer.$with("filtered_collections").as(
    indexer
      .select({
        id: collections.id,
      })
      .from(collections)
      .where(
        and(
          eq(collections.member, member),
          // exclude welcome & zero class
          not(inArray(collections.class, ["Welcome", "Zero"])),
          // exclude unobtainable collections
          not(inArray(collections.slug, unobtainables)),
          // apply filters
          ...(onlineType !== null
            ? [eq(collections.onOffline, onlineType)]
            : []),
          ...(season !== null ? [eq(collections.season, season)] : [])
        )
      )
  );

  // cte 2: filter distinct owners
  const distinctOwners = indexer.$with("distinct_owners").as(
    indexer
      .selectDistinct({
        owner: objekts.owner,
        collectionId: objekts.collectionId,
      })
      .from(objekts)
      .innerJoin(
        filteredCollections,
        eq(objekts.collectionId, filteredCollections.id)
      )
      // exclude @cosmo-spin
      .where(not(eq(objekts.owner, Addresses.SPIN)))
  );

  // final query: count distinct owners
  return await indexer
    .with(filteredCollections, distinctOwners)
    .select({
      owner: distinctOwners.owner,
      count: count(distinctOwners.collectionId).as("count"),
    })
    .from(distinctOwners)
    .groupBy(distinctOwners.owner)
    .orderBy(sql`count desc`)
    .limit(LEADERBOARD_COUNT);
}
