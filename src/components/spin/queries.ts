import { COSMO_ENDPOINT, ValidArtist } from "@/lib/universal/cosmo/common";
import { CosmoSpinGetTickets } from "@/lib/universal/cosmo/spin";
import { queryOptions } from "@tanstack/react-query";
import { ofetch } from "ofetch";

/**
 * Get the tickets for a given artist.
 */
export const ticketsQuery = (accessToken: string, artist: ValidArtist) =>
  queryOptions({
    queryKey: ["spin-tickets", artist],
    queryFn: () => {
      const endpoint = new URL(
        `/bff/v3/spin/tickets/${artist}`,
        COSMO_ENDPOINT
      );
      return ofetch<CosmoSpinGetTickets>(endpoint.toString(), {
        retry: 1,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    },
  });
