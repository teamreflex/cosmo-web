import "server-only";
import {
  COSMO_ENDPOINT,
  ValidArtist,
  CosmoArtist,
  CosmoArtistWithMembers,
} from "@/lib/universal/cosmo";

type CosmoArtistsResult = {
  artists: CosmoArtist[];
};

/**
 * Fetch all artists within Cosmo.
 */
export async function fetchArtists() {
  const res = await fetch(`${COSMO_ENDPOINT}/artist/v1`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch artists");
  }

  const { artists }: CosmoArtistsResult = await res.json();
  return artists;
}

/**
 * Fetch a single artist with its members.
 */
export async function fetchArtist(artist: ValidArtist) {
  const res = await fetch(`${COSMO_ENDPOINT}/artist/v1/${artist}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch artist");
  }

  const { artist: result }: { artist: CosmoArtistWithMembers } =
    await res.json();
  return result;
}

export function isValidArtist(artist: string): artist is ValidArtist {
  return artist === "artms" || artist === "tripleS";
}
