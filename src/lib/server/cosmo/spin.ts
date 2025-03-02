import { ValidArtist } from "@/lib/universal/cosmo/common";
import { cosmo } from "../http";
import { CosmoSpinGetTickets } from "@/lib/universal/cosmo/spin";

/**
 * steps:
 * 1. pre-sign with tokenId, save spinId
 * 2. send objekt to spin address
 * 3. submit spin with spinId upon transaction receipt
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
