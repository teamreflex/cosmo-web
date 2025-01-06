import { cosmo } from "@/lib/server/http";
import { COSMO_ENDPOINT, ValidArtist } from "@/lib/universal/cosmo/common";
import {
  CosmoRewardAvailable,
  CosmoRewardList,
} from "@/lib/universal/cosmo/rewards";
import { queryOptions } from "@tanstack/react-query";

/**
 * Check if the user has any rewards available to claim.
 */
export const getRewardsClaimable = (artist: ValidArtist, token: string) =>
  queryOptions({
    queryKey: ["rewards-claimable", artist],
    queryFn: async () => {
      // gives the illusion of loading rather than flickering instantly
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const endpoint = new URL("/bff/v1/check-event-rewards", COSMO_ENDPOINT);
      return await cosmo<CosmoRewardAvailable>(endpoint.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        query: {
          tid: crypto.randomUUID(),
          artistName: artist,
        },
      });
    },
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

/**
 * Get the list of rewards available to claim.
 */
export const getAvailableRewards = (artist: ValidArtist, token: string) =>
  queryOptions({
    queryKey: ["rewards-available", artist],
    queryFn: async () => {
      const endpoint = new URL("/bff/v1/event-rewards", COSMO_ENDPOINT);
      return await cosmo<CosmoRewardList>(endpoint.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        query: {
          tid: crypto.randomUUID(),
          artistName: artist,
        },
      });
    },
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
