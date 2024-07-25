import { ValidArtist } from "@/lib/universal/cosmo/common";
import { cosmo } from "../http";
import { v4 } from "uuid";
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
  CosmoActivityRankingTopEntry,
} from "@/lib/universal/cosmo/activity/ranking";

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
      tid: v4(),
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-cache",
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
        tid: v4(),
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-cache",
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
      tid: v4(),
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-cache",
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
      tid: v4(),
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-cache",
  });
}

/**
 * Fetch a user's ranking with users near them.
 */
export async function fetchActivityRankingNear(
  token: string,
  options: BFFActivityRankingNearParams
) {
  return await cosmo<CosmoActivityRankingNearResult>(
    `/bff/v1/activity/artist-rank/near-people`,
    {
      query: {
        ...options,
        tid: v4(),
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-cache",
    }
  );
}

/**
 * Fetch the ranking for a given artist/member.
 */
export async function fetchActivityRankingTop(
  token: string,
  options: BFFActivityRankingTopParams
) {
  return await cosmo<CosmoActivityRankingTopEntry[]>(
    `/bff/v1/activity/artist-rank/top`,
    {
      query: {
        ...options,
        tid: v4(),
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-cache",
    }
  );
}
