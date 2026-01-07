import { cacheHeaders } from "@/lib/server/cache";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import type {
  ObjektCollectionData,
  ObjektMetadata,
} from "@/lib/universal/objekts";
import { Addresses, addr } from "@apollo/util";
import { createFileRoute } from "@tanstack/react-router";
import { eq, sql } from "drizzle-orm";

export const Route = createFileRoute("/api/objekts/metadata/$slug/")({
  server: {
    handlers: {
      /**
       * API route for individual objekt dialogs.
       * Fetches metadata about a collection.
       */
      GET: async ({ params }) => {
        const [collection, data] = await Promise.all([
          fetchCollection(params.slug),
          fetchEventForCollection(params.slug),
        ]);

        return Response.json(
          {
            total: collection.total,
            transferable: collection.transferable,
            percentage: collection.percentage,
            data,
          } satisfies ObjektMetadata,
          {
            headers: cacheHeaders({
              cdn: 1000 * 60 * 10, // 10 minutes
              tags: ["objekt", `metadata:${params.slug}`],
            }),
          },
        );
      },
    },
  },
});

/**
 * Fetch the number of copies of a collection.
 */
async function fetchCollection(slug: string) {
  const result = await indexer
    .select({
      createdAt: collections.createdAt,
      total: sql<number>`COUNT(*)`,
      transferable: sql<number>`COUNT(CASE WHEN transferable = true AND ${
        objekts.owner
      } != ${addr(Addresses.SPIN)} THEN 1 END)`,
      percentage: sql<number>`
        ROUND(
          100.0 * COUNT(CASE WHEN transferable = true AND ${
            objekts.owner
          } != ${addr(Addresses.SPIN)} THEN 1 END) / COUNT(*), 
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
 * Fetch the event that includes this collection.
 */
async function fetchEventForCollection(
  collectionId: string,
): Promise<ObjektCollectionData | undefined> {
  return await db.query.collectionData.findFirst({
    where: { collectionId },
    columns: {
      id: true,
      collectionId: true,
      description: true,
    },
    with: {
      event: {
        columns: {
          id: true,
          slug: true,
          name: true,
          eventType: true,
          twitterUrl: true,
          description: true,
        },
        with: {
          era: {
            columns: {
              id: true,
              slug: true,
              name: true,
              spotifyAlbumArt: true,
              imageUrl: true,
            },
          },
        },
      },
    },
  });
}
