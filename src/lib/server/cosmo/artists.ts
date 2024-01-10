import "server-only";
import {
  CosmoArtist,
  CosmoArtistWithMembers,
} from "@/lib/universal/cosmo/artists";
import { ValidArtist, validArtists } from "@/lib/universal/cosmo/common";
import { cosmo } from "../http";

type CosmoArtistsResult = {
  artists: CosmoArtist[];
};

/**
 * Fetch all artists within Cosmo.
 * Cached for 1 hour.
 */
export async function fetchArtists() {
  return await cosmo<CosmoArtistsResult>("/artist/v1", {
    next: {
      tags: ["artists"],
      revalidate: 60 * 60,
    },
  }).then((res) => res.artists);
}

/**
 * Fetch a single artist with its members.
 * Cached for 1 hour.
 */
async function fetchArtist(artist: ValidArtist) {
  return await cosmo<{ artist: CosmoArtistWithMembers }>(
    `/artist/v1/${artist}`,
    {
      next: {
        tags: ["artist-with-members", artist],
        revalidate: 60 * 60,
      },
    }
  ).then((res) => res.artist);
}

/**
 * Fetch all artists with their members.
 * Cached for 1 hour.
 */
export async function fetchArtistsWithMembers() {
  return await Promise.all(validArtists.map((artist) => fetchArtist(artist)));
}
