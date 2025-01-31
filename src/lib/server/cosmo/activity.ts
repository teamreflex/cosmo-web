import { ValidArtist } from "@/lib/universal/cosmo/common";
import { cosmo } from "../http";
import { FetchError } from "ofetch";
import {
  BFFActivityHistoryParams,
  CosmoActivityHistoryItem,
} from "@/lib/universal/cosmo/activity/history";
import { CosmoActivityMyObjektResult } from "@/lib/universal/cosmo/activity/my-objekt";
import { CosmoActivityWelcomeResult } from "@/lib/universal/cosmo/activity/welcome";

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
