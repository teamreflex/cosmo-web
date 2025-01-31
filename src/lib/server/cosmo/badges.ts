import {
  BFFActivityBadgeParams,
  CosmoActivityBadgeDetail,
  CosmoActivityBadgeFiltersResult,
  CosmoActivityBadgeResult,
  CosmoActivityLatestBadge,
} from "@/lib/universal/cosmo/activity/badges";
import { cosmo } from "../http";
import { ValidArtist } from "@/lib/universal/cosmo/common";

/**
 * Fetch a user's badges.
 */
export async function fetchActivityBadges(
  token: string,
  options: BFFActivityBadgeParams
) {
  const { lang, ...opts } = options;
  return await cosmo<CosmoActivityBadgeResult>(`/bff/v4/badges`, {
    query: opts,
    headers: {
      Authorization: `Bearer ${token}`,
      "Accept-Language": lang,
    },
  });
}

/**
 * Fetch the latest badge for a given artist.
 */
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
 * Fetch the detail of a badge.
 */
export async function fetchActivityBadgeDetail(token: string, id: number) {
  return await cosmo<CosmoActivityBadgeDetail>(`/bff/v4/badges/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Fetch the detail of a badge.
 */
export async function fetchActivityBadgeFilters(token: string) {
  return await cosmo<CosmoActivityBadgeFiltersResult>(`/bff/v4/badge-filters`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
