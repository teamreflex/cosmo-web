import {
  CosmoAlbumTrack,
  CosmoAlbumWithTracks,
} from "@/lib/universal/cosmo/albums";
import { DBSchema } from "idb";

export interface OMASchema extends DBSchema {
  albums: {
    key: string;
    value: CosmoAlbumWithTracks;
    indexes: {
      "by-hid": string;
    };
  };

  tracks: {
    key: string;
    value: {
      data: Blob;
      track: CosmoAlbumTrack;
    };
    indexes: {
      "by-album": string;
    };
  };
}
