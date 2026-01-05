import { fetchArtist, fetchArtists } from "@apollo/cosmo/server/artists";
import type { CosmoArtistWithMembersBFF } from "@apollo/cosmo/types/artists";
import { createServerFn } from "@tanstack/react-start";
import { remember } from "./cache";
import { getProxiedToken } from "./proxied-token";

/**
 * Fetch artists and full member data from COSMO.
 * Cached for 1 hour.
 */
export const $fetchArtists = createServerFn({ method: "GET" }).handler(
  async () => {
    return await remember("artists", 60 * 60, async () => {
      const { accessToken } = await getProxiedToken();
      const artists = await fetchArtists(accessToken);
      const withMembers = await Promise.all(
        artists.map((artist) => fetchArtist(accessToken, artist.name)),
      );
      const artistMap: Record<string, CosmoArtistWithMembersBFF> = {};
      withMembers.forEach((artist) => {
        artistMap[artist.id.toLowerCase()] = artist;
      });

      return { artists: artistMap };
    });
  },
);
