import { z } from "zod/v4";
import { type ValidArtist, validArtists } from "../common";
import { parse } from "../../parsers";

const bffActivityBadgeSchema = z.object({
  lang: z.enum(["en", "ko"]).optional().default("en"),
  artistId: z.enum(validArtists),
  skip: z.coerce.number().optional().default(0),
  badgeCategory: z.string().optional(),
  badgeSubcategory: z.string().optional(),
});
export type BFFActivityBadgeParams = z.infer<typeof bffActivityBadgeSchema>;

/**
 * Parse BFF activity badge params with default fallback.
 */
export function parseBffActivityBadgeParams(params: URLSearchParams) {
  return parse(
    bffActivityBadgeSchema,
    {
      lang: params.get("lang"),
      artistId: params.get("artistId"),
      skip: params.get("skip"),
      badgeCategory: params.get("badgeCategory") ?? undefined,
      badgeSubcategory: params.get("badgeSubcategory") ?? undefined,
    },
    {
      lang: "en",
      artistId: "artms",
      skip: 0,
    }
  );
}

export type CosmoActivityBadgeResult = {
  totalCount: number;
  filteredCount: number;
  items: CosmoActivityBadge[];
};

export type CosmoActivityBadge = {
  id: number;
  badgeCategory: string;
  badgeType: string;
  season: string | null;
  artistId: ValidArtist;
  image: string;
  title: string;
  grantedAt: string;
};

export type CosmoActivityLatestBadge = {
  image: string;
};

export interface CosmoActivityBadgeDetail extends CosmoActivityBadge {
  acquiredUserCount: number;
}

export type CosmoActivityBadgeFilterSubcategory = {
  key: string;
  value: string;
};

export type CosmoActivityBadgeFilterCategory = {
  name: string;
  subCategory: CosmoActivityBadgeFilterSubcategory[];
};

export type CosmoActivityBadgeFiltersResult = {
  category: CosmoActivityBadgeFilterCategory[];
  type: string[];
};
