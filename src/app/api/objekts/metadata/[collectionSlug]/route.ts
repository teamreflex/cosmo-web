import { cacheHeaders } from "@/app/api/common";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import { ObjektMetadata } from "@/lib/universal/objekts";
import { eq, sql } from "drizzle-orm";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    collectionSlug: string;
  }>;
};

/**
 * API route for individual objekt dialogs.
 * Fetches metadata about a collection.
 */
export async function GET(_: Request, props: Params) {
  const params = await props.params;
  const [collection, metadata] = await Promise.all([
    fetchCollection(params.collectionSlug),
    fetchCollectionMetadata(params.collectionSlug),
  ]);

  if (!metadata) {
    return Response.json({
      metadata: undefined,
      total: collection.total,
      transferable: collection.transferable,
      percentage: collection.percentage,
    } satisfies ObjektMetadata);
  }

  const timestamp = collection.createdAt.getTime();
  const now = new Date().getTime();
  const hourInMs = 1000 * 60 * 60;

  let cacheTime: number;

  /**
   * cache for:
   * - <= 12 hours: 5 minutes
   * - > 12 hours: 1 hour
   */
  if (now - timestamp <= 12 * hourInMs) {
    cacheTime = 5 * 60;
  } else {
    cacheTime = 60 * 60;
  }

  return Response.json(
    {
      metadata,
      total: collection.total,
      transferable: collection.transferable,
      percentage: collection.percentage,
    } satisfies ObjektMetadata,
    {
      headers: cacheHeaders(cacheTime),
    }
  );
}

/**
 * Fetch the number of copies of a collection.
 * TODO: Refactor to calculate based on SCO count, due to transferability status not being accurate.
 */
async function fetchCollection(slug: string) {
  const result = await indexer
    .select({
      createdAt: collections.createdAt,
      total: sql<number>`COUNT(*)`,
      transferable: sql<number>`COUNT(CASE WHEN transferable = true THEN 1 END)`,
      percentage: sql<number>`
        ROUND(
          100.0 * COUNT(CASE WHEN transferable = true THEN 1 END) / COUNT(*), 
          2
        )
      `,
    })
    .from(collections)
    .leftJoin(objekts, eq(collections.id, objekts.collectionId))
    .where(eq(collections.slug, slug))
    .groupBy(collections.id, collections.createdAt);

  const collection = result[0];
  if (!collection) {
    return {
      createdAt: new Date(),
      total: 0,
      transferable: 0,
      percentage: 0,
    };
  }

  return {
    ...collection,
    createdAt: new Date(collection.createdAt),
  };
}

/**
 * Fetch metadata for a collection.
 */
async function fetchCollectionMetadata(slug: string) {
  return await db.query.objektMetadata.findFirst({
    where: {
      collectionId: slug,
    },
    with: {
      profile: {
        columns: {
          username: true,
        },
      },
    },
  });
}
