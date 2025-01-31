import { ValidArtist } from "@/lib/universal/cosmo/common";
import { cosmo } from "../http";
import { FetchError } from "ofetch";
import {
  BFFActivityBadgeParams,
  CosmoActivityBadgeResult,
  CosmoActivityLatestBadge,
} from "@/lib/universal/cosmo/activity/badges";
import {
  BFFActivityHistoryParams,
  CosmoActivityHistoryItem,
} from "@/lib/universal/cosmo/activity/history";
import { CosmoActivityMyObjektResult } from "@/lib/universal/cosmo/activity/my-objekt";
import { CosmoActivityWelcomeResult } from "@/lib/universal/cosmo/activity/welcome";
import {
  BFFActivityRankingLastParams,
  BFFActivityRankingNearParams,
  BFFActivityRankingTopParams,
  CosmoActivityRankingLast,
  CosmoActivityRankingNearResult,
  CosmoActivityRankingResult,
  CosmoActivityRankingTopResult,
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
      tid: crypto.randomUUID(),
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
        tid: crypto.randomUUID(),
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
      tid: crypto.randomUUID(),
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
  return await cosmo<CosmoActivityBadgeResult>(`/bff/v3/badges`, {
    query: {
      ...options,
      tid: crypto.randomUUID(),
    },
    headers: {
      Authorization: `Bearer ${token}`,
      "Accept-Language": options.lang,
    },
  });
}

export async function fetchActivityLatestBadge(
  token: string,
  artistId: ValidArtist
) {
  return await cosmo<CosmoActivityLatestBadge>(`/bff/v4/latest-badge`, {
    query: {
      artistId,
      tid: crypto.randomUUID(),
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
 * Fetch the ranking for a given artist/member.
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
