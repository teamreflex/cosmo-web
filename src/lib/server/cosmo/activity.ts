import { ValidArtist } from "@/lib/universal/cosmo/common";
import { cosmo } from "../http";
import { FetchError } from "ofetch";
import {
  BFFActivityBadgeParams,
  CosmoActivityBadgeResult,
} from "@/lib/universal/cosmo/activity/badges";
import {
  BFFActivityHistoryParams,
  CosmoActivityHistoryItem,
} from "@/lib/universal/cosmo/activity/history";
import { CosmoActivityMyObjektResult } from "@/lib/universal/cosmo/activity/my-objekt";
import { CosmoActivityWelcomeResult } from "@/lib/universal/cosmo/activity/welcome";
import {
  BFFActivityRankingNearParams,
  BFFActivityRankingTopParams,
  CosmoActivityRankingNearResult,
  CosmoActivityRankingResult,
  CosmoActivityRankingTopEntry,
} from "@/lib/universal/cosmo/activity/ranking";
import { randomUUID } from "crypto";

type FetchActivityWelcomeResultSuccess = {
  success: true;
  result: CosmoActivityWelcomeResult;
};

type FetchActivityWelcomeResultError = {
  success: false;
  error: "error" | "not-following";
};

type FetchActivityWelcomeResult =
  | FetchActivityWelcomeResultSuccess
  | FetchActivityWelcomeResultError;

/**
 * Fetch a user's follow length.
 */
export async function fetchActivityWelcome(
  token: string,
  artistName: ValidArtist
): Promise<FetchActivityWelcomeResult> {
  return await cosmo<CosmoActivityWelcomeResult>(`/bff/v1/activity/welcome`, {
    query: {
      artistName,
      tid: randomUUID(),
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then(
      (result) =>
        ({
          success: true,
          result,
        } satisfies FetchActivityWelcomeResultSuccess)
    )
    .catch((error: FetchError) => {
      if (error.status === 404) {
        return {
          success: false,
          error: "not-following",
        };
      }

      return {
        success: false,
        error: "error",
      };
    });
}

/**
 * Fetch a user's objekt count per member.
 */
export async function fetchActivityMyObjekts(
  token: string,
  artistName: ValidArtist
) {
  return await cosmo<CosmoActivityMyObjektResult>(
    `/bff/v1/activity/my-objekts`,
    {
      query: {
        artistName,
        tid: randomUUID(),
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

/**
 * Fetch a user's history.
 */
export async function fetchActivityHistory(
  token: string,
  options: BFFActivityHistoryParams
) {
  return await cosmo<CosmoActivityHistoryItem[]>(`/bff/v1/activity/history`, {
    query: {
      ...options,
      tid: randomUUID(),
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Fetch a user's badges
 */
export async function fetchActivityBadges(
  token: string,
  options: BFFActivityBadgeParams
) {
  return await cosmo<CosmoActivityBadgeResult>(`/bff/v1/activity/badge`, {
    query: {
      ...options,
      tid: randomUUID(),
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Fetch a user's ranking with users near them.
 */
export async function fetchActivityRankingNear(
  token: string,
  options: BFFActivityRankingNearParams
) {
  return await cosmo<
    CosmoActivityRankingResult<CosmoActivityRankingNearResult>
  >(`/bff/v1/activity/artist-rank/near-people`, {
    query: {
      ...options,
      tid: randomUUID(),
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
  return await cosmo<
    CosmoActivityRankingResult<CosmoActivityRankingTopEntry[]>
  >(`/bff/v1/activity/artist-rank/top`, {
    query: {
      ...options,
      tid: randomUUID(),
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
