import "server-only";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { cosmo } from "../http";
import { CosmoAlbum } from "@/lib/universal/cosmo/albums";

/**
 * Fetch a list of albums.
 */
export async function fetchAlbums(token: string, artistName: ValidArtist) {
  return await cosmo<CosmoAlbum[]>(`/bff/v3/albums`, {
    query: {
      artistName,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-cache",
  });
}
