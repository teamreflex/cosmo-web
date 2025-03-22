import { cacheHeaders } from "@/app/api/common";
import { indexer } from "@/lib/server/db/indexer";
import { Objekt } from "@/lib/universal/objekt-conversion";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    collectionSlug: string;
  }>;
};

/**
 * API route for individual objekt dialogs.
 * Fetches a single objekt from the database.
 * Cached for 1 hour.
 */
export async function GET(_: Request, props: Params) {
  const params = await props.params;
  const collection = await indexer.query.collections.findFirst({
    where: {
      slug: params.collectionSlug,
    },
  });

  if (!collection) {
    return Response.json({ message: `Collection not found` }, { status: 404 });
  }

  const common = Objekt.fromIndexer(collection);
  return Response.json(common, {
    headers: cacheHeaders(60 * 60),
  });
}
