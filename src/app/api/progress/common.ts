import { indexer } from "@/lib/server/db/indexer";
import { collections } from "@/lib/server/db/indexer/schema";
import { ValidOnlineType } from "@/lib/universal/cosmo/common";
import { and, eq, inArray, not } from "drizzle-orm";

/**
 * Fetch all collections for the given member.
 */
export async function fetchTotal(
  member: string,
  onlineType: ValidOnlineType | null = null
) {
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
        not(inArray(collections.class, ["Welcome", "Zero"])),
        ...(onlineType !== null ? [eq(collections.onOffline, onlineType)] : [])
      )
    );

  return result;
}

export type PartialCollection = Awaited<ReturnType<typeof fetchTotal>>;
