import { sql } from "drizzle-orm";
import { tradeOffers } from "./schema";

/**
 * What every listing write sets `updated_at` to: the database clock, but
 * always at least a millisecond past the old value, so it strictly increases
 * however the app servers' clocks drift. Accept compares it to the value the
 * claimer saw.
 */
export const bumpUpdatedAt = sql`greatest(clock_timestamp(), ${tradeOffers.updatedAt} + interval '1 millisecond')`;
