import "server-only";
import {
  CosmoArtistBFF,
  CosmoArtistWithMembersBFF,
  CosmoArtistWithMembers,
} from "@/lib/universal/cosmo/artists";
import { ValidArtist, validArtists } from "@/lib/universal/cosmo/common";
import { cosmo } from "../http";
import { unstable_cache } from "next/cache";

/**
 * Fetch a single artist with its members.
 * Cached for 12 hours.
 * @deprecated
 */
export async function fetchArtist(artist: ValidArtist) {
  return await cosmo<{ artist: CosmoArtistWithMembers }>(
    `/artist/v1/${artist}`,
    {
      next: {
        revalidate: 60 * 60 * 12,
      },
    }
  ).then((res) => res.artist);
}

/**
 * Fetch all artists.
 * Cached for 12 hours.
 */
export async function fetchArtistsBff() {
  return await cosmo<CosmoArtistBFF[]>(`/bff/v3/artists`, {
    next: {
      revalidate: 60 * 60 * 12,
    },
  });
}

/**
 * Fetch an artist.
 * Cached for 12 hours.
 */
export async function fetchArtistBff(artistName: ValidArtist) {
  return await cosmo<CosmoArtistWithMembersBFF>(
    `/bff/v3/artists/${artistName}`,
    {
      next: {
        revalidate: 60 * 60 * 12,
      },
    }
  );
}
