import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { fetchArtist, fetchArtists } from "@apollo/cosmo/server/artists";
import { cacheHeaders, clearTag, remember } from "./cache";
import { getProxiedToken } from "./proxied-token";
import type {
  CosmoArtistWithMembersBFF,
  CosmoMemberBFF,
} from "@apollo/cosmo/types/artists";

const cacheKey = "artists";

/**
 * Fetch artists and full member data from COSMO.
 * Cached for:
 * - browser: 30 seconds
 * - CDN: 1 hour
 * - Redis: 24 hours
 */
export const $fetchArtists = createServerFn({ method: "GET" }).handler(
  async () => {
    setResponseHeaders(new Headers(cacheHeaders({ cdn: 60 * 60 })));

    return await remember(cacheKey, 60 * 24, async () => {
      const { accessToken } = await getProxiedToken();
      const artists = await fetchArtists(accessToken);
      const withMembers = await Promise.all(
        artists.map((artist) => fetchArtist(accessToken, artist.name)),
      );
      const artistMap: Record<string, CosmoArtistWithMembersBFF> = {};
      withMembers.forEach((artist) => {
        artistMap[artist.id.toLowerCase()] = artist;
      });

      const memberMap: Record<string, CosmoMemberBFF> = {};
      withMembers.forEach((artist) => {
        artist.artistMembers.forEach((member) => {
          memberMap[member.name.toLowerCase()] = member;
        });
      });

      return { artists: artistMap, members: memberMap };
    });
  },
);

/**
 * Reset the Redis artists cache.
 */
export const $resetArtistsCache = createServerFn({ method: "POST" }).handler(
  async () => {
    await clearTag(cacheKey);
  },
);
