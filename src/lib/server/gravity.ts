import { desc } from "drizzle-orm";
import { db } from "./db";
import { gravities } from "./db/schema";

/**
 * Fetch all gravities and group them by artist.
 */
export async function fetchGravities() {
  const data = await db
    .select()
    .from(gravities)
    .orderBy(desc(gravities.startDate));
  return Object.groupBy(data, (r) => r.artist);
}
