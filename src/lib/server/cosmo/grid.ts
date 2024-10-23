import "server-only";
import {
  CosmoGrid,
  CosmoGridEdition,
  CosmoGridRewardClaimResult,
  CosmoGridSlotCompletion,
  CosmoOngoingGrid,
} from "@/lib/universal/cosmo/grid";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { cosmo } from "../http";

type GridStatus = {
  totalCompletedGrids: number;
  totalSpecialObjekts: number;
};

/**
 * Fetch the total number of grids completed for the artist.
 */
export async function fetchGridStatus(token: string, artist: ValidArtist) {
  return await cosmo<GridStatus>(`/grid/v3/${artist}/status`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

type CosmoGridEditionResult = {
  editions: CosmoGridEdition[];
};

/**
 * Fetch all grid editions for the artist.
 */
export async function fetchEditions(token: string, artist: ValidArtist) {
  return await cosmo<CosmoGridEditionResult>(`/grid/v3/${artist}/edition`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then((res) => res.editions);
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
  return await cosmo<CosmoGridResult>(
    `/grid/v3/${artist}/edition/${editionSlug}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  ).then((res) => res.grids);
}

/**
 * Fetch status of a grid.
 */
export async function fetchArtistGridStatus(token: string, gridSlug: string) {
  return await cosmo<CosmoOngoingGrid>(`/grid/v1/${gridSlug}/status`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Complete a grid
 */
export async function completeGrid(
  token: string,
  gridSlug: string,
  slots: CosmoGridSlotCompletion[]
) {
  return await cosmo(`/grid/v1/${gridSlug}/complete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: { slots },
  }).then(() => true);
}

/**
 * Claim a grid reward.
 */
export async function claimGridReward(token: string, gridSlug: string) {
  return await cosmo<CosmoGridRewardClaimResult>(
    `/grid/v1/${gridSlug}/claim-reward`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}
