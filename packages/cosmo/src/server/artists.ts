import type { CosmoArtist, CosmoArtistWithMembersBFF } from "../types/artists";
import type { ValidArtist } from "../types/common";
import { cosmo } from "./http";

/**
 * Fetch artists within COSMO.
 */
export async function fetchArtists(token: string) {
  return await cosmo<CosmoArtist[]>(`/bff/v3/artists`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Fetch a single artist and its members.
 */
export async function fetchArtist(token: string, artistId: ValidArtist) {
  return await cosmo<CosmoArtistWithMembersBFF>(`/bff/v3/artists/${artistId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
