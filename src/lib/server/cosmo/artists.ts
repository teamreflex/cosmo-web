import "server-only";
import {
  CosmoArtist,
  CosmoArtistBFF,
  CosmoArtistWithMembers,
} from "@/lib/universal/cosmo/artists";
import { ValidArtist, validArtists } from "@/lib/universal/cosmo/common";
import { cosmo } from "../http";
import { unstable_cache } from "next/cache";
import { v4 } from "uuid";

type CosmoArtistsResult = {
  artists: CosmoArtist[];
};

/**
 * Fetch all artists within Cosmo.
 * Cached for 12 hours.
 */
export async function fetchArtists() {
  return await cosmo<CosmoArtistsResult>("/artist/v1", {
    next: {
      tags: ["artists"],
      revalidate: 60 * 60 * 12,
    },
  }).then((res) => res.artists);
}

/**
 * Fetch a single artist with its members.
 */
async function fetchArtist(artist: ValidArtist) {
  return await cosmo<{ artist: CosmoArtistWithMembers }>(
    `/artist/v1/${artist}`
  ).then((res) => res.artist);
}

/**
 * Fetch all artists with their members.
 * Cached for 12 hours.
 */
export const fetchArtistsWithMembers = unstable_cache(
  async () => Promise.all(validArtists.map((artist) => fetchArtist(artist))),
  ["artists-with-members"],
  { revalidate: 60 * 60 * 12 }
);

/**
 * Fetch an artist.
 */
export async function fetchArtistBff(token: string, artistName: ValidArtist) {
  return await cosmo<CosmoArtistBFF>(`/bff/v1/artist`, {
    query: {
      artistName,
      tid: v4(),
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-cache",
  });
}
