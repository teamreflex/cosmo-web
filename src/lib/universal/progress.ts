import { ValidClass, ValidOnlineType, ValidSeason } from "./cosmo/common";

export type SeasonMatrix = {
  season: ValidSeason;
  class: ValidClass;
  type: ValidOnlineType;
  key: string;
};

export type FinalProgress = SeasonMatrix & {
  total: number;
  progress: number;
};
