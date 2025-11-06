import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { cacheHeaders, clearTag, remember } from "./cache";
import { getProxiedToken } from "./proxied-token";
import { fetchArtist, fetchArtists } from "./cosmo/artists";
import type { CosmoArtistWithMembersBFF } from "../universal/cosmo/artists";

const cacheKey = "artists";

/**
 * Fetch artists and full member data from COSMO.
 * Cached for:
 * - browser: 30 seconds
 * - CDN: 1 hour
 * - Redis: 24 hours
 */
export const $fetchArtists = createServerFn({ method: "GET" }).handler(
  async (): Promise<CosmoArtistWithMembersBFF[]> => {
    setResponseHeaders(cacheHeaders({ cdn: 60 * 60 }));

    return await remember(cacheKey, 60 * 24, async () => {
      const { accessToken } = await getProxiedToken();
      const artists = await fetchArtists(accessToken);
      return await Promise.all(
        artists.map((artist) => fetchArtist(accessToken, artist.name)),
      );
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
