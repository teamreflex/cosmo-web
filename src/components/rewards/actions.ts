"use server";

import { decodeUser } from "@/app/data-fetching";
import { claimEventRewards } from "@/lib/server/cosmo/rewards";
import { getSelectedArtist } from "@/lib/server/profiles";
import {
  ActionResultError,
  ActionResultSuccess,
  TypedActionResult,
} from "@/lib/server/typed-action/types";

/**
 * Claim all event rewards for the user.
 */
export async function submitEventRewards(): Promise<
  TypedActionResult<boolean>
> {
  const user = await decodeUser();
  if (!user) {
    return {
      status: "error",
      error: "Sign in to claim event rewards",
    } satisfies ActionResultError;
  }

  try {
    const artist = await getSelectedArtist();
    await claimEventRewards(user.accessToken, artist);

    return {
      status: "success",
      data: true,
    } satisfies ActionResultSuccess<boolean>;
  } catch (err) {
    console.error(err);
  }

  return {
    status: "error",
    error:
      "Error claiming event rewards. Try again or use the app to claim your rewards.",
  } satisfies ActionResultError;
}
