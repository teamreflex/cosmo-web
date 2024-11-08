import { z } from "zod";
import { ValidArtist, validArtists } from "../common";
import { parse } from "../../parsers";

const bffActivityRankingNearSchema = z.object({
  artistName: z.enum(validArtists),
  kind: z.enum(["hold_objekts_per_season", "grid_per_season"]),
  memberId: z.coerce.number().optional(),
  marginAbove: z.coerce.number().optional().default(1),
  marginBefore: z.coerce.number().optional().default(1),
});

export type BFFActivityRankingNearParams = z.infer<
  typeof bffActivityRankingNearSchema
>;

/**
 * Parse BFF activity ranking near people params with default fallback.
 */
export function parseBffActivityRankingNearParams(params: URLSearchParams) {
  return parse(
    bffActivityRankingNearSchema,
    {
      artistName: params.get("artistName"),
      kind: params.get("kind"),
      memberId: params.get("memberId"),
      marginAbove: params.get("marginAbove"),
      marginBefore: params.get("marginBefore"),
    },
    {
      artistName: "artms",
      kind: "hold_objekts_per_season",
      marginAbove: 1,
      marginBefore: 1,
    }
  );
}

const bffActivityRankingTopSchema = z.object({
  artistName: z.enum(validArtists),
  kind: z.enum(["hold_objekts_per_season", "grid_per_season"]),
  memberId: z.coerce.number().optional(),
  size: z.coerce.number().optional().default(10),
});

export type BFFActivityRankingTopParams = z.infer<
  typeof bffActivityRankingTopSchema
>;

/**
 * Parse BFF activity top ranking params with default fallback.
 */
export function parseBffActivityRankingTopParams(params: URLSearchParams) {
  return parse(
    bffActivityRankingTopSchema,
    {
      artistName: params.get("artistName"),
      kind: params.get("kind"),
      size: params.get("size"),
      memberId: params.get("memberId"),
    },
    {
      artistName: "artms",
      kind: "hold_objekts_per_season",
      size: 10,
    }
  );
}

export type CosmoActivityRankingNearResult = {
  season: string;
  artistRank: CosmoActivityRankingArtistRank;
  nearPeoples: CosmoActivityRankingNearUser[];
};

export type CosmoActivityRankingKind =
  | "hold_objekts_per_season"
  | "grid_per_season";

export type CosmoActivityRankingArtistRank = {
  activeAt: string;
  hid: string;
  artistName: ValidArtist;
  kind: CosmoActivityRankingKind;
  memberId: number;
  rangeFrom: string;
  rangeTo: string;
  maxRank: number;
};

export type CosmoActivityRankingUser = {
  id: number;
  nickname: string;
};

export type CosmoActivityRankingProfileImage = {
  artistName: ValidArtist;
  profileImageUrl: string;
};

export type CosmoActivityRankingNearUser = {
  // number of objekts or grids completed
  rankData: number;
  // actual ranking number
  rankNumber: number;
  nearPeopleCount: number;
  relativePosition: "above" | "below" | "current";
  representUser: {
    user: CosmoActivityRankingUser;
    profiles: CosmoActivityRankingProfileImage[];
  };
};

export type CosmoActivityRankingTopEntry = {
  season: string;
  user: {
    user: CosmoActivityRankingUser;
    profiles: CosmoActivityRankingProfileImage[];
  };
  rankItem: {
    rankData: number;
    rankNumber: number;
  };
};

export type CosmoActivityRankingResult<T> =
  | {
      success: false;
      error: string;
    }
  | {
      success: true;
      data: T;
    };
