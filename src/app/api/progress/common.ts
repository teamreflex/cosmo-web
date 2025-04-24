import { indexer } from "@/lib/server/db/indexer";
import { Collection, collections } from "@/lib/server/db/indexer/schema";
import { ValidOnlineType, ValidSeason } from "@/lib/universal/cosmo/common";
import { and, desc, eq, inArray, not } from "drizzle-orm";

type FetchTotal = {
  member: string;
  onlineType?: ValidOnlineType | null;
  season?: ValidSeason | null;
};

/**
 * Fetch all collections for the given member.
 */
export async function fetchTotal({
  member,
  onlineType = null,
  season = null,
}: FetchTotal): Promise<Collection[]> {
  const result = await indexer
    .select()
    .from(collections)
    .where(
      and(
        eq(collections.member, member),
        not(inArray(collections.class, ["Welcome", "Zero"])),
        ...(onlineType !== null ? [eq(collections.onOffline, onlineType)] : []),
        ...(season !== null ? [eq(collections.season, season)] : [])
      )
    )
    .orderBy(desc(collections.createdAt));

  return result;
}
