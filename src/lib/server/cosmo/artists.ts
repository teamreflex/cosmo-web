import { COSMO_ENDPOINT, ValidArtist } from "./common";

export type CosmoArtist = {
  name: string;
  title: string;
  logoImageUrl: string;
  contracts: {
    Como: string;
    Objekt: string;
    ObjektMinter: string;
    Governor: string;
    CommunityPool: string;
    ComoMinter: string;
  };
};

type CosmoArtistsResult = {
  artists: CosmoArtist[];
};

/**
 * Fetch all artists within Cosmo.
 * @returns Promise<CosmoArtist[]>
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

export type CosmoMember = {
  name: string;
  artist: ValidArtist;
  units: string[];
  alias: string;
  profileImageUrl: string;
  mainObjektImageUrl: string;
  order: number;
};

export type CosmoArtistWithMembers = CosmoArtist & {
  members: CosmoMember[];
};

/**
 * Fetch a single artist with its members.
 * @returns Promise<CosmoArtist[]>
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
