import { Collection } from "../server/db/indexer/schema";
import { ValidClass, ValidOnlineType, ValidSeason } from "./cosmo/common";

export type SeasonMatrix = {
  season: ValidSeason;
  class: ValidClass;
  type: ValidOnlineType | "combined";
  key: string;
};

export interface ObjektProgression
  extends Pick<
    Collection,
    | "collectionNo"
    | "frontImage"
    | "textColor"
    | "class"
    | "season"
    | "onOffline"
  > {
  obtained: boolean;
  unobtainable: boolean;
}

export interface SeasonProgress extends SeasonMatrix {
  total: number;
  progress: number;
  unobtainable: number;
  collections: ObjektProgression[];
}

export type LeaderboardItem = {
  count: number;
  nickname: string;
  address: string;
  isAddress: boolean;
};

export type Leaderboard = {
  total: number;
  leaderboard: LeaderboardItem[];
};
