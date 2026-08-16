import { remember } from "@/lib/server/cache.server";
import { getProxiedToken } from "@/lib/server/proxied-token.server";
import { getRequestSignal } from "@/lib/server/request.server";
import { runCosmo } from "@apollo/cosmo/runtime";
import { CosmoArtistWithMembersBFFSchema } from "@apollo/cosmo/schema/artists";
import { fetchAllArtists } from "@apollo/cosmo/server/artists";
import type { CosmoArtistWithMembersBFF } from "@apollo/cosmo/types/artists";
import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";

export const ARTISTS_CACHE_KEY = "artists";

// COSMO owns the artist shape, so cached values are validated on read
const CachedArtistsSchema = Schema.Struct({
  artists: Schema.Record(Schema.String, CosmoArtistWithMembersBFFSchema),
});

/**
 * Fetch artists and full member data from COSMO.
 * Cached for 1 hour.
 */
export const $fetchArtists = createServerFn({ method: "GET" }).handler(
  async () => {
    const signal = getRequestSignal();
    return await remember(
      ARTISTS_CACHE_KEY,
      60 * 60,
      async () => {
        const { accessToken } = await getProxiedToken(signal);
        const withMembers = await runCosmo(
          fetchAllArtists(accessToken),
          signal,
        );
        const artistMap: Record<string, CosmoArtistWithMembersBFF> = {};
        withMembers.forEach((artist) => {
          artistMap[artist.id.toLowerCase()] = artist;
        });

        return { artists: artistMap };
      },
      CachedArtistsSchema,
    );
  },
);
