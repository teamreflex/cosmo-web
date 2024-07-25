import { z } from "zod";
import { ValidArtist, validArtists } from "../common";
import { parse } from "../../parsers";

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
  claim?: {
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
