import { cosmo } from "../http";
import { CosmoRewardItem } from "@/lib/universal/cosmo/rewards";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { randomUUID } from "crypto";

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
      tid: randomUUID(),
      artistName: artist,
    },
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
      tid: randomUUID(),
      artistName: artist,
    },
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
      tid: randomUUID(),
      artistName: artist,
    },
  });

  return true;
}
