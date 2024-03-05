import { Collection } from "../server/db/indexer/schema";
import { ValidClass, ValidOnlineType, ValidSeason } from "./cosmo/common";

export type SeasonMatrix = {
  season: ValidSeason;
  class: ValidClass;
  type: ValidOnlineType | "combined";
  key: string;
};

export type ObjektProgression = Pick<
  Collection,
  "collectionNo" | "frontImage" | "textColor" | "class" | "season" | "onOffline"
> & {
  obtained: boolean;
};

export type FinalProgress = SeasonMatrix & {
  total: number;
  progress: number;
  collections: ObjektProgression[];
};

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
