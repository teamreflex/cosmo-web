import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import {
  validClasses,
  validOnlineTypes,
  validSeasons,
} from "@/lib/universal/cosmo/common";
import { FinalProgress, SeasonMatrix } from "@/lib/universal/progress";
import { SQL, and, eq, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * API route that services the /@:nickname/progress page.
 * Takes an address and a member name, and returns the collection progress breakdown of that member.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  const member = request.nextUrl.searchParams.get("member");
  if (!member) {
    return NextResponse.json({
      count: 0,
    });
  }

  const matrix = buildMatrix();
  const selects = buildSelects(matrix);

  const [totals, progress] = await Promise.all([
    fetchTotal(member),
    fetchProgress(params.address.toLowerCase(), member, selects),
  ]);

  return NextResponse.json(zipResults(matrix, totals, progress));
}

/**
 * Build a matrix of all available classes, seasons and online types.
 */
function buildMatrix(): SeasonMatrix[] {
  const classes = validClasses.filter((c) => !["Zero", "Welcome"].includes(c));
  return validOnlineTypes.flatMap((type) =>
    validSeasons.flatMap((season) => {
      return classes.map((c) => ({
        key: `${season.toLowerCase()}_${c.toLowerCase()}_${type}`,
        season,
        type,
        class: c,
      }));
    })
  );
}

/**
 * Build the SQL queries for each season/class combination.
 * This is split out so `unstable_cache` can call it with clean input params for caching.
 */
function buildSelects(matrix: SeasonMatrix[]) {
  return matrix.reduce((acc, m) => {
    acc[
      m.key
    ] = sql<number>`cast(SUM(CASE WHEN (${collections.season} = ${m.season} AND ${collections.class} = ${m.class} AND ${collections.onOffline} = ${m.type}) THEN 1 ELSE 0 END) as int)`;
    return acc;
  }, {} as Record<string, SQL<number>>);
}

type ProgressBreakdown = {
  [season_class_type: string]: number;
};

/**
 * Fetch objekt collection progress for the given user/member.
 */
async function fetchProgress(
  address: string,
  member: string,
  selects: Record<string, SQL<number>>
): Promise<ProgressBreakdown> {
  const subquery = indexer
    // ensure we only count each collection once
    .selectDistinctOn([objekts.collectionId])
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(
      and(
        // only operate on objekts the address owns
        eq(objekts.owner, address),
        // only operate on objekts of the given member
        eq(collections.member, member)
      )
    )
    .orderBy(objekts.collectionId)
    .as("subquery");

  // count the results
  const result = await indexer.select(selects).from(subquery);
  return result[0] ?? {};
}

/**
 * New objekts don't drop often, so cache this result.
 */
const fetchTotal = unstable_cache(
  async (member: string): Promise<ProgressBreakdown> => {
    const selects = buildSelects(buildMatrix());

    const result = await indexer
      .select(selects)
      .from(collections)
      .where(eq(collections.member, member));

    return result[0] ?? {};
  },
  ["progress-total"], // param (member name) gets added to this
  { revalidate: 60 * 60 } // 1 hour
);

/**
 * Merge the total and progress counts into the matrix.
 */
function zipResults(
  matrix: SeasonMatrix[],
  total: ProgressBreakdown,
  progress: ProgressBreakdown
): FinalProgress[] {
  return matrix.map((m) => ({
    ...m,
    total: total[m.key] ?? 0,
    progress: progress[m.key] ?? 0,
  }));
}
