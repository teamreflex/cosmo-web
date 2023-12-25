import { eq } from "drizzle-orm";
import { db } from "../db";
import { profiles } from "../db/schema";
import { notFound } from "next/navigation";

/**
 * Fetch locked objekts and objekt lists for a user.
 */
export async function fetchProfileRelations(nickname: string) {
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.nickname, nickname),
    with: {
      lockedObjekts: true,
      lists: true,
    },
  });

  if (!profile) {
    notFound();
  }

  return {
    lockedObjekts: profile.lockedObjekts
      .filter((o) => o.locked)
      .map((o) => o.tokenId),
    lists: profile.lists,
  };
}
