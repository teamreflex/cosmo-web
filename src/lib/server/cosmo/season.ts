import { ValidArtist } from "@/lib/universal/cosmo/common";
import { cosmo } from "../http";
import { CosmoSeason } from "@/lib/universal/cosmo/season";

/**
 * Fetch seasons for the given artist.
 */
export async function fetchSeasons(token: string, artist: ValidArtist) {
  return await cosmo<CosmoSeason[]>(`/bff/v3/seasons/${artist}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
