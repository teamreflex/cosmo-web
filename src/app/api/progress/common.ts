import { indexer } from "@/lib/server/db/indexer";
import { collections } from "@/lib/server/db/indexer/schema";
import { and, eq, inArray, not } from "drizzle-orm";
import { unstable_cache } from "next/cache";

/**
 * Fetch all collections for the given member.
 * Cached for one hour.
 */
export const fetchTotal = unstable_cache(
  async (member: string) => {
    const result = await indexer
      .select({
        id: collections.id,
        collectionNo: collections.collectionNo,
        frontImage: collections.frontImage,
        textColor: collections.textColor,
        member: collections.member,
        season: collections.season,
        class: collections.class,
        onOffline: collections.onOffline,
      })
      .from(collections)
      .where(
        and(
          eq(collections.member, member),
          not(inArray(collections.class, ["Welcome", "Zero"]))
        )
      );

    return result;
  },
  ["collections-for-member"], // param (member name) gets added to this
  { revalidate: 60 * 60 } // 1 hour
);

export type PartialCollection = Awaited<ReturnType<typeof fetchTotal>>;
