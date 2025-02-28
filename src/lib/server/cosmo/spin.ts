import { ValidArtist } from "@/lib/universal/cosmo/common";
import { cosmo } from "../http";
import {
  CosmoSpinCompleteRequest,
  CosmoSpinCompleteResponse,
  CosmoSpinGetTickets,
  CosmoSpinPresignResponse,
  CosmoSpinSeasonRate,
  CosmoSpinStatisticsResponse,
} from "@/lib/universal/cosmo/spin";

/**
 * steps:
 * 1. pre-sign with tokenId, save spinId
 * 2. send objekt to spin address
 * 3. submit spin with spinId
 * 4. complete spin with spinId and index of selection, response contains all options
 */

/**
 * Fetch the number of tickets available for the artist.
 */
export async function fetchSpinTickets(token: string, artist: ValidArtist) {
  return await cosmo<CosmoSpinGetTickets>(`/bff/v3/spin/tickets/${artist}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Fetch the statistics for the artist.
 */
export async function fetchSpinStatistics(token: string, artist: ValidArtist) {
  return await cosmo<CosmoSpinStatisticsResponse>(
    `/bff/v3/spin/statistic/${artist}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

/**
 * Fetch the pull rates for the given artist.
 */
export async function fetchSpinRates(token: string, artist: ValidArtist) {
  return await cosmo<CosmoSpinSeasonRate[]>(`/bff/v3/spin/rate/${artist}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Pre-sign a spin with the given token ID.
 */
export async function presignSpin(token: string, tokenId: number) {
  return await cosmo<CosmoSpinPresignResponse>(`/bff/v3/spin/pre-sign`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: {
      usedTokenId: tokenId,
    },
  });
}

/**
 * Submit a spin with the given spin ID.
 */
export async function submitSpin(token: string, spinId: number) {
  return await cosmo<void>(`/bff/v3/spin`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: {
      spinId,
    },
  }).then(() => true);
}

/**
 * Submit the chosen objekt for the spin.
 */
export async function completeSpin(
  token: string,
  params: CosmoSpinCompleteRequest
) {
  return await cosmo<CosmoSpinCompleteResponse>(`/bff/v3/spin/complete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: params,
  });
}
