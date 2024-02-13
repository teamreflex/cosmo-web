import { z } from "zod";
import { parse } from "../parsers";
import { validArtists } from "./common";

export type CosmoRekordArtistMember = {
  id: number;
  name: string;
  profileImage: string;
};

export type CosmoRekordArtist = {
  name: string;
  title: string;
  profileImage: string;
};

export type CosmoRekordPost = {
  id: number;
  totalLikeCount: number;
  createdAt: string;
  updatedAt: string;
  expiredAt: string;
  isExpired: boolean;
  isBlinded: boolean;
  isDeleted: boolean;
  isArchived: boolean;
  isLikedPost: boolean;
  isReportedPost: boolean;
  owner: {
    id: number;
    nickname: string;
  };
  artistMembers: CosmoRekordArtistMember[];
  artist: CosmoRekordArtist;
  image: {
    thumbnail: string;
    large: string;
  };
};

export type CosmoRekordTopPost = {
  post: CosmoRekordPost;
  rank: number;
};

export type CosmoRekordArchiveStatus = {
  postCount: number;
  likeCount: number;
  followerCount: number;
  fandomName: string;
};

export const rekordFilterSchema = z.object({
  artistName: z.enum(validArtists),
  limit: z.coerce.number().optional().default(30),
  sort: z.enum(["desc", "asc"]).optional().default("desc"),
  includeFromPost: z.coerce.boolean().optional(),
  fromPostId: z.coerce.number().optional(),
  seekDirection: z.enum(["before_than"]).optional(),
});
export type RekordParams = z.infer<typeof rekordFilterSchema>;

/**
 * Parse rekord params with default fallback.
 */
export function parseRekordFilters(params: URLSearchParams) {
  return parse(
    rekordFilterSchema,
    {
      artistName: params.get("artistName"),
      limit: params.get("limit"),
      sort: params.get("sort") || undefined,
      includeFromPost: params.get("includeFromPost"),
      fromPostId: params.get("fromPostId"),
      seekDirection: params.get("seekDirection"),
    },
    {
      artistName: "artms",
      limit: 30,
      sort: "desc",
      includeFromPost: undefined,
      fromPostId: undefined,
      seekDirection: undefined,
    }
  );
}

export type RekordResponse = {
  results: CosmoRekordPost[];
  fromPostId: number;
};
