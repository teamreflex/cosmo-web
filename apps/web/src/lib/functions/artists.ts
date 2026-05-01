import { remember } from "@/lib/server/cache.server";
import { getProxiedToken } from "@/lib/server/proxied-token.server";
import { getRequestSignal } from "@/lib/server/request.server";
import { fetchArtist, fetchArtists } from "@apollo/cosmo/server/artists";
import type { CosmoArtistWithMembersBFF } from "@apollo/cosmo/types/artists";
import { createServerFn } from "@tanstack/react-start";

export const ARTISTS_CACHE_KEY = "artists";

/**
 * Fetch artists and full member data from COSMO.
 * Cached for 1 hour.
 */
export const $fetchArtists = createServerFn({ method: "GET" }).handler(
  async () => {
    const signal = getRequestSignal();
    return await remember(ARTISTS_CACHE_KEY, 60 * 60, async () => {
      const { accessToken } = await getProxiedToken(signal);
      const artists = await fetchArtists(accessToken, signal);
      const withMembers = await Promise.all(
        artists.map((artist) => fetchArtist(accessToken, artist.name, signal)),
      );
      const artistMap: Record<string, CosmoArtistWithMembersBFF> = {};
      withMembers.forEach((artist) => {
        artistMap[artist.id.toLowerCase()] = artist;
      });

      return { artists: artistMap };
    });
  },
);
