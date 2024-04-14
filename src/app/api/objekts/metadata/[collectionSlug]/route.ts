import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import { objektMetadata } from "@/lib/server/db/schema";
import { count, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

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
export async function GET(request: NextRequest, { params }: Params) {
  const metadata = await fetchMetadata(params.collectionSlug);
  return NextResponse.json(metadata);
}

/**
 * Fetch the number of copies of a collection.
 */
async function fetchCollectionCopies(collectionSlug: string) {
  const subquery = indexer
    .select({
      objektCollectionId: objekts.collectionId,
      collectionSlug: collections.slug,
    })
    .from(objekts)
    .leftJoin(collections, eq(objekts.collectionId, collections.id))
    .where(eq(collections.slug, collectionSlug))
    .as("subquery");

  const result = await indexer
    .select({
      count: count(),
    })
    .from(subquery);

  return result[0]?.count ?? 0;
}

/**
 * Fetch metadata for a collection.
 */
async function fetchCollectionMetadata(collectionSlug: string) {
  return await db.query.objektMetadata.findFirst({
    where: eq(objektMetadata.collectionId, collectionSlug),
    with: {
      profile: true,
    },
  });
}

/**
 * Fetch information about a collection.
 * Cached for 15 minutes.
 */
const fetchMetadata = (collection: string) =>
  unstable_cache(
    async (collection: string) => {
      const [copies, metadata] = await Promise.all([
        fetchCollectionCopies(collection),
        fetchCollectionMetadata(collection),
      ]);

      return { copies, metadata: metadata };
    },
    [`collection-metadata`],
    {
      revalidate: 60 * 15, // 15 minutes
      tags: [`collection-metadata:${collection}`],
    }
  )(collection);