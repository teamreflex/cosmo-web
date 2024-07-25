import { z } from "zod";
import { validArtists } from "../common";
import { parse } from "../../parsers";
import { subMonths } from "date-fns";

export const activityHistoryTypes = [
  "all",
  "grid_complete",
  "gravity_vote",
  "objekt_all",
  "objekt_purchase",
  "objekt_receive",
  "objekt_send",
] as const;
export type CosmoActivityHistoryType = (typeof activityHistoryTypes)[number];

export type CosmoActivityHistoryItem = {
  icon: string;
  timestamp: string;
  title: string;
  body: string;
  caption?: string;
};

const bffActivityHistorySchema = z.object({
  artistName: z.enum(validArtists),
  historyType: z.enum(activityHistoryTypes),
  fromTimestamp: z.string().datetime(),
  toTimestamp: z.string().datetime(),
});
export type BFFActivityHistoryParams = z.infer<typeof bffActivityHistorySchema>;

/**
 * Parse BFF activity history params with default fallback.
 */
export function parseBffActivityHistoryParams(params: URLSearchParams) {
  const now = new Date();
  return parse(
    bffActivityHistorySchema,
    {
      artistName: params.get("artistName"),
      historyType: params.get("historyType"),
      fromTimestamp: params.get("fromTimestamp"),
      toTimestamp: params.get("toTimestamp"),
    },
    {
      artistName: "artms",
      historyType: "all",
      fromTimestamp: subMonths(now, 1).toISOString(),
      toTimestamp: now.toISOString(),
    }
  );
}
