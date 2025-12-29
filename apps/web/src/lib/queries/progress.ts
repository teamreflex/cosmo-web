import type { ValidOnlineType } from "@apollo/cosmo/types/common";
import { queryOptions } from "@tanstack/react-query";
import {
  $fetchArtistStatsByAddress,
  $fetchProgressBreakdown,
  $fetchProgressLeaderboard,
} from "../server/progress";

export const artistStatsQuery = (address: string) =>
  queryOptions({
    queryKey: ["artist-stats", address],
    queryFn: ({ signal }) =>
      $fetchArtistStatsByAddress({ signal, data: { address } }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const progressBreakdownQuery = (address: string, member: string) =>
  queryOptions({
    queryKey: ["progress-breakdown", address, member],
    queryFn: ({ signal }) =>
      $fetchProgressBreakdown({ signal, data: { address, member } }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const progressLeaderboardQuery = (
  member: string,
  onlineType: ValidOnlineType | undefined,
  season: string | undefined,
) =>
  queryOptions({
    queryKey: ["progress-leaderboard", member, onlineType, season],
    queryFn: ({ signal }) =>
      $fetchProgressLeaderboard({
        signal,
        data: { member, onlineType, season },
      }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
