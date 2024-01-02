import { ValidClass, ValidSeason } from "./cosmo/common";

export type SeasonMatrix = {
  season: ValidSeason;
  class: ValidClass;
  key: string;
};

export type FinalProgress = SeasonMatrix & {
  total: number;
  progress: number;
};
