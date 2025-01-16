import { z } from "zod";
import { ValidArtist, validArtists } from "../common";
import { parse } from "../../parsers";

const bffActivityBadgeSchema = z.object({
  lang: z.enum(["en", "ko"]).optional().default("en"),
  artistName: z.enum(validArtists),
  page: z.coerce.number().optional().default(1),
  size: z.coerce.number().optional().default(30),
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
      artistName: params.get("artistName"),
      page: params.get("page"),
      size: params.get("size"),
    },
    {
      lang: "en",
      artistName: "artms",
      page: 1,
      size: 30,
    }
  );
}

export type CosmoActivityBadge = {
  id: number;
  hid: string;
  artistId: ValidArtist;
  createdAt: string;
  updatedAt: string;
  "2DImage": {
    originalImage: string;
    thumbnailImage: string;
  };
  "3DFileUrl": string | null;
  artistName: ValidArtist;
  title: string;
  description: string;
};

export type CosmoActivityBadgeResult = {
  items: CosmoActivityBadge[];
  count: number;
};
