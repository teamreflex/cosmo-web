import { v4 } from "uuid";
import { cosmo } from "../http";
import { CosmoRewardItem } from "@/lib/universal/cosmo/rewards";
import { ValidArtist } from "@/lib/universal/cosmo/common";

type CosmoRewardAvailable = {
  isClaimable: boolean;
};

/**
 * Check if the given user is eligible for an event reward.
 */
export async function fetchEventRewardAvailable(
  token: string,
  artist: ValidArtist
) {
  return await cosmo<CosmoRewardAvailable>(`/bff/v1/check-event-rewards`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    query: {
      tid: v4(),
      artistName: artist,
    },
    cache: "no-cache",
  }).then((res) => res.isClaimable);
}

type CosmoRewardList = {
  count: number;
  items: CosmoRewardItem[];
  claimCount: number;
};

/**
 * Fetch the list of pending event rewards for the given user.
 */
export async function fetchPendingEventRewards(
  token: string,
  artist: ValidArtist
) {
  return await cosmo<CosmoRewardList>(`/bff/v1/event-rewards`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    query: {
      tid: v4(),
      artistName: artist,
    },
    cache: "no-cache",
  });
}

/**
 * Claim all pending event rewards for the given user.
 */
export async function claimEventRewards(token: string, artist: ValidArtist) {
  await cosmo(`/bff/v1/event-rewards`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    query: {
      tid: v4(),
      artistName: artist,
    },
    cache: "no-cache",
  });

  return true;
}
