import { db } from "@/lib/server/db";
import type { ObjektCollectionData } from "@/lib/universal/objekts";

/**
 * Fetch the event and era metadata attached to a collection, keyed by slug.
 * Shared between the objekt metadata endpoint and third-party endpoints.
 */
export async function fetchCollectionEvent(
  slug: string,
): Promise<ObjektCollectionData | undefined> {
  return await db.query.collectionData.findFirst({
    where: { collectionId: slug },
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
