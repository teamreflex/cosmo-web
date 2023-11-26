import "server-only";
import {
  COSMO_ENDPOINT,
  CosmoGrid,
  CosmoGridEdition,
  CosmoGridRewardClaimResult,
  CosmoGridSlotCompletion,
  CosmoOngoingGrid,
  ValidArtist,
} from "@/lib/universal/cosmo";

type GridStatus = {
  totalCompletedGrids: number;
  totalSpecialObjekts: number;
};

/**
 * Fetch the total number of grids completed for the artist.
 */
export async function fetchGridStatus(token: string, artist: ValidArtist) {
  const res = await fetch(`${COSMO_ENDPOINT}/grid/v3/${artist}/status`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch grid status");
  }

  const result: GridStatus = await res.json();
  return result;
}

type CosmoGridEditionResult = {
  editions: CosmoGridEdition[];
};

/**
 * Fetch all grid editions for the artist.
 */
export async function fetchEditions(token: string, artist: ValidArtist) {
  const res = await fetch(`${COSMO_ENDPOINT}/grid/v3/${artist}/edition`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch grid editions");
  }

  const { editions }: CosmoGridEditionResult = await res.json();
  return editions;
}

type CosmoGridResult = {
  grids: CosmoGrid[];
};

/**
 * Fetch all grids for the given edition.
 */
export async function fetchEdition(
  token: string,
  artist: ValidArtist,
  editionSlug: string
) {
  const res = await fetch(
    `${COSMO_ENDPOINT}/grid/v3/${artist}/edition/${editionSlug}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch grid edition "${editionSlug}"`);
  }

  const { grids }: CosmoGridResult = await res.json();
  return grids;
}

/**
 * Fetch status of a grid.
 */
export async function fetchArtistGridStatus(token: string, gridSlug: string) {
  const res = await fetch(`${COSMO_ENDPOINT}/grid/v1/${gridSlug}/status`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch grid "${gridSlug}"`);
  }

  const result: CosmoOngoingGrid = await res.json();
  return result;
}

/**
 * Complete a grid
 */
export async function completeGrid(
  token: string,
  gridSlug: string,
  slots: CosmoGridSlotCompletion[]
) {
  const res = await fetch(`${COSMO_ENDPOINT}/grid/v1/${gridSlug}/complete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ slots }),
  });

  if (!res.ok) {
    throw new Error(`Failed to complete grid "${gridSlug}"`);
  }

  return true;
}

/**
 * Claim a grid reward.
 */
export async function claimGridReward(token: string, gridSlug: string) {
  const res = await fetch(
    `${COSMO_ENDPOINT}/grid/v1/${gridSlug}/claim-reward`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to claim grid reward for "${gridSlug}"`);
  }

  return (await res.json()) as CosmoGridRewardClaimResult;
}
