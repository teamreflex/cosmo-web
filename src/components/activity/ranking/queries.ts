import {
  CosmoActivityRankingKind,
  CosmoActivityRankingLast,
  CosmoActivityRankingNearResult,
  CosmoActivityRankingResult,
  CosmoActivityRankingTopResult,
} from "@/lib/universal/cosmo/activity/ranking";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { baseUrl } from "@/lib/utils";
import { queryOptions } from "@tanstack/react-query";
import { ofetch } from "ofetch";

/**
 * Query for the near people ranking.
 */
export function nearPeopleQuery(
  artist: ValidArtist,
  kind: CosmoActivityRankingKind,
  memberId: string
) {
  // gravity ranking is not per member, so we need to pass null
  const mappedMemberId =
    kind === "gravity_per_como_in_season" ? null : memberId;

  return queryOptions({
    queryKey: ["ranking", "near", artist, kind, memberId],
    queryFn: async () => {
      const url = new URL(`/api/bff/v3/rank/near-people`, baseUrl());
      return await ofetch<
        CosmoActivityRankingResult<CosmoActivityRankingNearResult>
      >(url.toString(), {
        query: {
          artistId: artist,
          kind,
          memberId: mappedMemberId,
          marginAbove: 1,
          marginBelow: 1,
        },
      });
    },
  });
}

/**
 * Query for the last ranking.
 */
export function lastRankQuery(artist: ValidArtist, memberId: string) {
  return queryOptions({
    queryKey: ["ranking", "last", artist, memberId],
    queryFn: async () => {
      const url = new URL(`/api/bff/v3/rank/last`, baseUrl());
      return await ofetch<
        CosmoActivityRankingResult<CosmoActivityRankingLast[]>
      >(url.toString(), {
        query: {
          artistId: artist,
          memberId,
        },
      });
    },
  });
}

/**
 * Query for the top ranking.
 */
export function topRankQuery(
  artist: ValidArtist,
  kind: CosmoActivityRankingKind,
  memberId: string
) {
  // gravity ranking is not per member, so we need to pass null
  const mappedMemberId =
    kind === "gravity_per_como_in_season" ? null : memberId;

  return queryOptions({
    queryKey: ["ranking", "top", artist, kind, memberId],
    queryFn: async () => {
      const url = new URL(`/api/bff/v3/rank/top`, baseUrl());
      return await ofetch<
        CosmoActivityRankingResult<CosmoActivityRankingTopResult>
      >(url.toString(), {
        query: {
          artistId: artist,
          kind,
          size: 10,
          memberId: mappedMemberId,
        },
      });
    },
  });
}
