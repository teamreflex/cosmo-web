import { createFileRoute } from "@tanstack/react-router";
import { eq, sql } from "drizzle-orm";
import { Addresses, addr } from "@apollo/util";
import type { ObjektMetadata } from "@/lib/universal/objekts";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import { cacheHeaders } from "@/lib/server/cache";

export const Route = createFileRoute("/api/objekts/metadata/$slug/")({
  server: {
    handlers: {
      /**
       * API route for individual objekt dialogs.
       * Fetches metadata about a collection.
       */
      GET: async ({ params }) => {
        const [collection, metadata] = await Promise.all([
          fetchCollection(params.slug),
          fetchCollectionMetadata(params.slug),
        ]);

        const timestamp = collection.createdAt.getTime();
        const now = new Date().getTime();
        const hourInMs = 1000 * 60 * 60;

        let cacheTime: number;

        /**
         * cache for:
         * - older than 12 hours: 5 minutes
         * - older than 24 hours: 1 hour
         * - older than 48 hours: 4 hours
         * - else: 12 hours
         */
        if (now - timestamp <= 12 * hourInMs) {
          cacheTime = 60 * 5;
        } else if (now - timestamp <= 24 * hourInMs) {
          cacheTime = 60 * 60;
        } else if (now - timestamp <= 48 * hourInMs) {
          cacheTime = 60 * 60 * 4;
        } else {
          cacheTime = 60 * 60 * 12;
        }

        return Response.json(
          {
            metadata,
            total: collection.total,
            transferable: collection.transferable,
            percentage: collection.percentage,
          } satisfies ObjektMetadata,
          {
            headers: cacheHeaders({ cdn: cacheTime }),
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
