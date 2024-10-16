import { cacheHeaders } from "@/app/api/common";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import { objektMetadata } from "@/lib/server/db/schema";
import { count, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";

export const runtime = "nodejs";

type Params = {
  params: {
    collectionSlug: string;
  };
};

/**
 * API route for individual objekt dialogs.
 * Fetches metadata about a collection.
 */
export async function GET(_: Request, props: Params) {
  const params = await props.params;
  const [copies, metadata] = await Promise.all([
    fetchCollection(params.collectionSlug),
    fetchCollectionMetadata(params.collectionSlug),
  ]);

  const timestamp = copies.createdAt.getTime();
  const now = new Date().getTime();
  const hourInMs = 1000 * 60 * 60;

  let cacheTime: number;

  /**
   * cache for:
   * - within 12 hours: 5 minutes
   * - within 24 hours: 1 hour
   * - within 48 hours: 8 hours
   * - older than 48 hours: 24 hours
   */
  if (now - timestamp <= 12 * hourInMs) {
    cacheTime = 5 * 60;
  } else if (now - timestamp <= 24 * hourInMs) {
    cacheTime = 60 * 60;
  } else if (now - timestamp <= 48 * hourInMs) {
    cacheTime = 8 * 60 * 60;
  } else {
    cacheTime = 24 * 60 * 60;
  }

  return Response.json(
    {
      copies: copies.count,
      metadata,
    },
    {
      headers: cacheHeaders(cacheTime),
    }
  );
}

/**
 * Fetch the number of copies of a collection.
 */
async function fetchCollection(collectionSlug: string) {
  const subquery = indexer
    .select({
      objektCollectionId: objekts.collectionId,
      collectionSlug: collections.slug,
      createdAt: collections.createdAt,
    })
    .from(objekts)
    .leftJoin(collections, eq(objekts.collectionId, collections.id))
    .where(eq(collections.slug, collectionSlug))
    .as("subquery");

  const rows = await indexer
    .select({
      count: count().as("count"),
      createdAt: subquery.createdAt,
    })
    .from(subquery)
    .groupBy(subquery.createdAt);

  const result = rows[0];
  return {
    count: result?.count ?? 0,
    createdAt: result?.createdAt ? new Date(result.createdAt) : new Date(),
  };
}

/**
 * Fetch metadata for a collection.
 */
async function fetchCollectionMetadata(slug: string) {
  return await db.query.objektMetadata.findFirst({
    where: eq(objektMetadata.collectionId, slug),
    with: {
      profile: true,
    },
  });
}
