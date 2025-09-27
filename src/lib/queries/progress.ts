import { queryOptions } from "@tanstack/react-query";
import {
  fetchArtistStatsByAddress,
  fetchProgressBreakdown,
  fetchProgressLeaderboard,
} from "../server/progress";
import type { ValidOnlineType } from "../universal/cosmo/common";

export const artistStatsQuery = (address: string) =>
  queryOptions({
    queryKey: ["artist-stats", address],
    queryFn: () => fetchArtistStatsByAddress({ data: { address } }),
  });

export const progressBreakdownQuery = (address: string, member: string) =>
  queryOptions({
    queryKey: ["progress-breakdown", address, member],
    queryFn: () => fetchProgressBreakdown({ data: { address, member } }),
  });

export const progressLeaderboardQuery = (
  member: string,
  onlineType: ValidOnlineType | undefined,
  season: string | undefined,
) =>
  queryOptions({
    queryKey: ["progress-leaderboard", member, onlineType, season],
    queryFn: () =>
      fetchProgressLeaderboard({ data: { member, onlineType, season } }),
  });
