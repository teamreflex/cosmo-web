import { z } from "zod";
import { ValidArtist, validArtists } from "./common";
import { parse } from "../parsers";
import { subMonths } from "date-fns";

export type CosmoActivityMyObjektMember = {
  name: string;
  profileImage: string;
  count: number;
  color: string;
};

export type CosmoActivityMyObjektResult = {
  totalCount: number;
  countByMember: CosmoActivityMyObjektMember[];
};

export type CosmoActivityWelcomeResult = {
  durationCount: number;
  fandomName: string;
};

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

const bffActivityBadgeSchema = z.object({
  artistName: z.enum(validArtists),
  page: z.coerce.number().optional().default(1),
  pageSize: z.coerce.number().optional().default(30),
});
export type BFFActivityBadgeParams = z.infer<typeof bffActivityBadgeSchema>;

/**
 * Parse BFF activity badge params with default fallback.
 */
export function parseBffActivityBadgeParams(params: URLSearchParams) {
  return parse(
    bffActivityBadgeSchema,
    {
      artistName: params.get("artistName"),
      page: params.get("page"),
      pageSize: params.get("pageSize"),
    },
    {
      artistName: "artms",
      page: 1,
      pageSize: 30,
    }
  );
}

export type CosmoActivityBadge = {
  id: number;
  hid: string;
  artistName: ValidArtist;
  title: string;
  description: string;
  "2DImage": {
    originalImage: string;
    thumbnailImage: string;
  };
  "3DImage": string[];
  claim: {
    hid: string;
    owner: string;
    badgeHid: string;
    grantedAt: string;
    createdAt: string;
    updatedAt: string;
  };
};

export type CosmoActivityBadgeResult = {
  items: CosmoActivityBadge[];
  count: number;
};
