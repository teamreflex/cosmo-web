import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import { validClasses, validSeasons } from "@/lib/universal/cosmo/common";
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
 * Build a matrix of all available classes and seasons.
 */
function buildMatrix(): SeasonMatrix[] {
  const classes = validClasses.filter((c) => !["Zero", "Welcome"].includes(c));
  return validSeasons.flatMap((season) => {
    return classes.map((c) => ({
      key: `${season.toLowerCase()}_${c.toLowerCase()}`,
      season,
      class: c,
    }));
  });
}

/**
 * Build the SQL queries for each season/class combination.
 * This is split out so `unstable_cache` can call it with clean input params for caching.
 */
function buildSelects(matrix: SeasonMatrix[]) {
  return matrix.reduce((acc, m) => {
    acc[
      m.key
    ] = sql<number>`cast(SUM(CASE WHEN (${collections.season} = ${m.season} AND ${collections.class} = ${m.class}) THEN 1 ELSE 0 END) as int)`;
    return acc;
  }, {} as Record<string, SQL<number>>);
}

type ProgressBreakdown = {
  [season_class: string]: number;
};

/**
 * Fetch objekt collection progress for the given user and member.
 */
async function fetchProgress(
  address: string,
  member: string,
  selects: Record<string, SQL<number>>
): Promise<ProgressBreakdown> {
  const result = await indexer
    .select(selects)
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(and(eq(objekts.owner, address), eq(collections.member, member)));
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
  ["collection-total"], // param (member name) gets added to this
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
  return matrix.map((m) => {
    const mTotal = total[m.key] ?? 0;
    const mProgress = progress[m.key] ?? 0;

    return {
      ...m,
      total: mTotal,
      // query fetches *all* objekts, so clamp to the total count
      progress: mProgress > mTotal ? mTotal : mProgress,
    };
  });
}
