import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import {
  validClasses,
  validOnlineTypes,
  validSeasons,
} from "@/lib/universal/cosmo/common";
import { FinalProgress, SeasonMatrix } from "@/lib/universal/progress";
import { and, eq } from "drizzle-orm";
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
  const [totals, progress] = await Promise.all([
    fetchTotal(member),
    fetchProgress(params.address.toLowerCase(), member),
  ]);

  return NextResponse.json(zipResults(matrix, totals, progress));
}

/**
 * Build a matrix of all available classes, seasons and online types.
 */
function buildMatrix(): SeasonMatrix[] {
  const onlineTypes = [...validOnlineTypes, "combined"] as const;

  const classes = validClasses.filter((c) => !["Zero", "Welcome"].includes(c));
  return onlineTypes.flatMap((type) =>
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
 * Fetch unique collections the user owns for given member.
 */
async function fetchProgress(address: string, member: string) {
  return await indexer
    // ensure we only count each collection once
    .selectDistinctOn([objekts.collectionId], {
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
        eq(collections.member, member)
      )
    )
    .orderBy(objekts.collectionId);
}

/**
 * Fetch all collections for the given member.
 * Cached for one hour.
 */
const fetchTotal = unstable_cache(
  async (member: string) => {
    const result = await indexer
      .select({
        id: collections.id,
        collectionNo: collections.collectionNo,
        frontImage: collections.frontImage,
        textColor: collections.textColor,
        member: collections.member,
        season: collections.season,
        class: collections.class,
        onOffline: collections.onOffline,
      })
      .from(collections)
      .where(eq(collections.member, member));

    return result;
  },
  ["collections-for-member"], // param (member name) gets added to this
  { revalidate: 60 * 60 } // 1 hour
);

type PartialCollection = Awaited<ReturnType<typeof fetchTotal>>;
type PartialObjekt = Awaited<ReturnType<typeof fetchProgress>>;

/**
 * Merge the total and progress counts into the matrix.
 */
function zipResults(
  matrix: SeasonMatrix[],
  total: PartialCollection,
  progress: PartialObjekt
): FinalProgress[] {
  return matrix.map((m) => {
    const type = m.type === "combined" ? undefined : m.type;

    const collectionsInScope = total.filter(
      filterMatrix(m.class, m.season, type)
    );
    const ownedInScope = progress.filter(filterMatrix(m.class, m.season, type));

    return {
      ...m,
      total: collectionsInScope.length,
      progress: ownedInScope.length,
      collections: collectionsInScope.map((c) => ({
        ...c,
        obtained: ownedInScope.some((p) => p.collectionId === c.id),
      })),
    };
  });
}

/**
 * Helper to filter down to the matrix.
 */
function filterMatrix<
  T extends { class: string; season: string; onOffline: string }
>(matrixClass: string, matrixSeason: string, matrixOnOffline?: string) {
  return ({ class: className, season, onOffline }: T) =>
    className === matrixClass &&
    season === matrixSeason &&
    (matrixOnOffline ? onOffline === matrixOnOffline : true);
}
