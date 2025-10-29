import { createServerOnlyFn } from "@tanstack/react-start";
import { cosmo } from "../http";
import type {
  CosmoArtist,
  CosmoArtistWithMembersBFF,
} from "@/lib/universal/cosmo/artists";
import type { ValidArtist } from "@/lib/universal/cosmo/common";

/**
 * Fetch artists within COSMO.
 */
export const fetchArtists = createServerOnlyFn(async (token: string) => {
  return await cosmo<CosmoArtist[]>(`/bff/v3/artists`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
});

/**
 * Fetch a single artist and its members.
 */
export const fetchArtist = createServerOnlyFn(
  async (token: string, artistId: ValidArtist) => {
    return await cosmo<CosmoArtistWithMembersBFF>(
      `/bff/v3/artists/${artistId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
  },
);
