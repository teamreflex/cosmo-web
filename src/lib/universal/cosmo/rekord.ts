import { z } from "zod/v4";
import { parse } from "../parsers";
import { validArtists } from "./common";

type CosmoRekordArtistMember = {
  id: number;
  name: string;
  profileImage: string;
};

type CosmoRekordArtist = {
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

export type CosmoRekordListItem = {
  post: CosmoRekordPost;
};

export type CosmoRekordArchiveItem = {
  post: CosmoRekordPost;
  archiveNo: number;
};

export type CosmoRekordTopItem = {
  post: CosmoRekordPost;
  rank: number;
};

export type CosmoRekordItem =
  | CosmoRekordListItem
  | CosmoRekordArchiveItem
  | CosmoRekordTopItem;

export type CosmoRekordArchiveStatus = {
  postCount: number;
  likeCount: number;
  followerCount: number;
  fandomName: string;
};

const rekordFilterSchema = z.object({
  artistName: z.enum(validArtists),
  limit: z.coerce.number().optional().default(30),
  sort: z.enum(["desc", "asc"]).optional().default("desc"),
  includeFromPost: z
    .string()
    .refine((s) => s === "true" || s === "false")
    .transform((s) => s === "true"),
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
      includeFromPost: false,
      fromPostId: undefined,
      seekDirection: undefined,
    }
  );
}

export type RekordResponse<TPostType> = {
  results: TPostType[];
  fromPostId: number;
};
