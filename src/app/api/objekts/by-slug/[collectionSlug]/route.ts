import { indexer } from "@/lib/server/db/indexer";
import { collections } from "@/lib/server/db/indexer/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: {
    collectionSlug: string;
  };
};

/**
 * API route for individual objekt dialogs.
 * Fetches a single objekt from the database.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const rows = await indexer
    .select()
    .from(collections)
    .where(eq(collections.slug, params.collectionSlug))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json(
      { message: `Collection not found` },
      { status: 404 }
    );
  }

  return NextResponse.json(rows[0]);
}
