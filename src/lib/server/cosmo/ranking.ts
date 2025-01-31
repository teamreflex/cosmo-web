import {
  BFFActivityRankingLastParams,
  BFFActivityRankingNearParams,
  BFFActivityRankingTopParams,
  CosmoActivityRankingLast,
  CosmoActivityRankingNearResult,
  CosmoActivityRankingResult,
  CosmoActivityRankingTopResult,
} from "@/lib/universal/cosmo/activity/ranking";
import { cosmo } from "../http";

/**
 * Fetch a user's ranking with users near them.
 */
export async function fetchActivityRankingNear(
  token: string,
  options: BFFActivityRankingNearParams
) {
  return await cosmo<
    CosmoActivityRankingResult<CosmoActivityRankingNearResult>
  >(`/bff/v3/rank/near-people`, {
    query: {
      ...options,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((res) => ({
      success: true,
      data: res,
    }))
    .catch(() => ({
      success: false,
      error: "Rankings are being calculated.",
    }));
}

/**
 * Fetch the ranking for a given artist/member.
 */
export async function fetchActivityRankingTop(
  token: string,
  options: BFFActivityRankingTopParams
) {
  return await cosmo<CosmoActivityRankingResult<CosmoActivityRankingTopResult>>(
    `/bff/v3/rank/top`,
    {
      query: {
        ...options,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )
    .then((res) => ({
      success: true,
      data: res,
    }))
    .catch(() => ({
      success: false,
      error: "Rankings are being calculated.",
    }));
}

/**
 * Fetch the ranking detail for a the current user.
 */
export async function fetchActivityRankingLast(
  token: string,
  options: BFFActivityRankingLastParams
) {
  return await cosmo<CosmoActivityRankingResult<CosmoActivityRankingLast[]>>(
    `/bff/v3/rank/last`,
    {
      query: options,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )
    .then((res) => ({
      success: true,
      data: res,
    }))
    .catch(() => ({
      success: false,
      error: "Rankings are being calculated.",
    }));
}
