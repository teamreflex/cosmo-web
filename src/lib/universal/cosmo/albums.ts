import { CosmoArtist } from "./artists";

export type CosmoAlbum = {
  hid: string;
  releasedAt: string;
  artist: CosmoArtist;
  title: string;
  albumImageThumbnailUrl: string;
  omaImageThumbnailUrl: string;
};
