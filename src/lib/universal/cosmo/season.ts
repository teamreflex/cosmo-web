import { ValidArtist } from "./common";

export type CosmoSeason = {
  title: string;
  activeAt: string;
  artistId: ValidArtist;
  primaryColor: string;
};
