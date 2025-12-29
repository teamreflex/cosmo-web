import type { ValidOnlineType } from "@apollo/cosmo/types/common";
import type { Collection } from "../server/db/indexer/schema";

export type SeasonMatrix = {
  season: string;
  class: string;
  type: ValidOnlineType | "combined";
  key: string;
};

export type ObjektProgression = {
  collection: Collection;
  obtained: boolean;
  unobtainable: boolean;
};

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

export type ProcessingArtistStats = {
  artistName: string;
  seasons: Map<string, number>;
  members: Map<string, number>;
  classes: Map<string, number>;
};

export type ArtistStats = {
  artistName: string;
  seasons: Stat[];
  members: Stat[];
  classes: Stat[];
};

export type Stat = {
  name: string;
  count: number;
};
