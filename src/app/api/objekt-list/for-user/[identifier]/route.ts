import { db } from "@/lib/server/db";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    identifier: string;
  }>;
};

/**
 * API route that returns all objekt lists for a given user.
 */
export async function GET(_: NextRequest, props: Params) {
  const params = await props.params;
  const profile = await db.query.profiles.findFirst({
    where: {
      OR: [{ nickname: params.identifier }, { userAddress: params.identifier }],
    },
    with: {
      lists: true,
    },
  });

  return Response.json({ results: profile?.lists ?? [] });
}
