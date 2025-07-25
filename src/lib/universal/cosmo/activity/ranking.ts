import { z } from "zod";
import { type ValidArtist, validArtists } from "../common";
import { parse } from "../../parsers";

// #region Common
export const rankingKinds = [
  "hold_objekts_per_season",
  "grid_per_season",
  "gravity_per_como_in_season",
] as const;

export type CosmoActivityRankingKind = (typeof rankingKinds)[number];

export type CosmoActivityRankingProfileImage = {
  artistId: ValidArtist;
  profileImageOriginal: string;
  profileImageThumbnail: string;
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
// #endregion

// #region Near
const bffActivityRankingNearSchema = z.object({
  artistId: z.enum(validArtists),
  kind: z.enum(rankingKinds),
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
      artistId: params.get("artistId"),
      kind: params.get("kind"),
      memberId: params.get("memberId"),
      marginAbove: params.get("marginAbove"),
      marginBefore: params.get("marginBefore"),
    },
    {
      artistId: "artms",
      kind: "hold_objekts_per_season",
      marginAbove: 1,
      marginBefore: 1,
    }
  );
}

export type CosmoActivityRankingNearResult = {
  season: string;
  nearPeople: CosmoActivityRankingNearUser[];
};

export type CosmoActivityRankingNearUser = {
  // number of objekts or grids completed
  rankData: number;
  // actual ranking number
  rankNumber: number;
  nearPeopleCount: number;
  relativePosition: "above" | "below" | "current";
  representUser: {
    nickname: string;
    userProfile: CosmoActivityRankingProfileImage[];
  };
};
// #endregion

// #region Top
const bffActivityRankingTopSchema = z.object({
  artistId: z.enum(validArtists),
  kind: z.enum(rankingKinds),
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
      artistId: params.get("artistId"),
      kind: params.get("kind"),
      size: params.get("size"),
      memberId: params.get("memberId"),
    },
    {
      artistId: "artms",
      kind: "hold_objekts_per_season",
      size: 10,
    }
  );
}

export type CosmoActivityRankingTopResult = {
  season: string;
  rankItems: CosmoActivityRankingTopEntry[];
};

export type CosmoActivityRankingTopEntry = {
  rankNumber: number;
  rankData: number;
  user: {
    nickname: string;
    userProfile: CosmoActivityRankingProfileImage[];
  };
};
// #endregion

// #region Last
const bffActivityRankingLastSchema = z.object({
  artistId: z.enum(validArtists),
  memberId: z.coerce.number().optional(),
});

export type BFFActivityRankingLastParams = z.infer<
  typeof bffActivityRankingLastSchema
>;

/**
 * Parse BFF activity last ranking params with default fallback.
 */
export function parseBffActivityRankingLastParams(params: URLSearchParams) {
  return parse(
    bffActivityRankingLastSchema,
    {
      artistId: params.get("artistId"),
      memberId: params.get("memberId"),
    },
    {
      artistId: "artms",
    }
  );
}

export type CosmoActivityRankingLast = {
  createdAt: string;
  updatedAt: string;
  activeAt: string;
  hid: string;
  artistId: ValidArtist;
  kind: CosmoActivityRankingKind;
  memberId: number | null;
  rangeFrom: string;
  rangeTo: string;
  maxRank: number;
};
// #endregion
