import { indexer } from "@/lib/server/db/indexer";
import {
  Collection,
  collections,
  objekts,
} from "@/lib/server/db/indexer/schema";
import { validOnlineTypes } from "@/lib/universal/cosmo/common";
import { SeasonProgress, SeasonMatrix } from "@/lib/universal/progress";
import { and, eq } from "drizzle-orm";
import { fetchTotal } from "../../../common";
import { cacheHeaders } from "@/app/api/common";
import { unobtainables } from "@/lib/unobtainables";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    address: string;
    member: string;
  }>;
};

/**
 * API route that services the /@:nickname/progress page.
 * Takes an address and a member name, and returns the collection progress breakdown of that member.
 * Cached for 1 hour.
 */
export async function GET(_: Request, props: Params) {
  const params = await props.params;

  const [totals, progress] = await Promise.all([
    fetchTotal({ member: params.member }),
    fetchProgress(params.address.toLowerCase(), params.member),
  ]);

  // dynamically build the matrix based on the data instead of hardcoding seasons and classes
  const classes = new Set<string>();
  const seasons = new Set<string>();
  for (const total of totals) {
    classes.add(total.class);
    seasons.add(total.season);
  }

  const matrix = buildMatrix(
    Array.from(classes).filter((c) => !["Zero", "Welcome"].includes(c)),
    Array.from(seasons)
  );

  return Response.json(zipResults(matrix, totals, progress), {
    headers: cacheHeaders({ vercel: 60 * 60 }),
  });
}

/**
 * Build a matrix of all available classes, seasons and online types.
 */
function buildMatrix(classes: string[], seasons: string[]): SeasonMatrix[] {
  const onlineTypes = [...validOnlineTypes, "combined"] as const;

  return onlineTypes.flatMap((type) =>
    seasons.flatMap((season) => {
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
        eq(collections.member, member)
      )
    )
    .orderBy(objekts.collectionId);
}

type PartialObjekt = Awaited<ReturnType<typeof fetchProgress>>;

/**
 * Merge the total and progress counts into the matrix.
 */
function zipResults(
  matrix: SeasonMatrix[],
  total: Collection[],
  progress: PartialObjekt
): SeasonProgress[] {
  return matrix.map((m) => {
    const type = m.type === "combined" ? undefined : m.type;

    const collectionsInScope = total.filter(
      filterMatrix(m.class, m.season, type)
    );
    const ownedInScope = progress.filter(filterMatrix(m.class, m.season, type));

    // exclude unobtainable collections from total count
    const totalCollections = collectionsInScope.filter(
      (c) => !unobtainables.includes(c.slug)
    ).length;

    // get unobtainable collections separately to be added in later
    const { progressTotal, unobtainableTotal } = ownedInScope.reduce(
      (acc, c) => {
        const isUnobtainable = unobtainables.includes(c.slug);
        acc.progressTotal += isUnobtainable ? 0 : 1;
        acc.unobtainableTotal += isUnobtainable ? 1 : 0;
        return acc;
      },
      { progressTotal: 0, unobtainableTotal: 0 }
    );

    return {
      ...m,
      total: totalCollections,
      progress: progressTotal,
      unobtainable: unobtainableTotal,
      collections: collectionsInScope.map((c) => ({
        collection: c,
        obtained: ownedInScope.some((p) => p.collectionId === c.id),
        unobtainable: unobtainables.includes(c.slug),
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
