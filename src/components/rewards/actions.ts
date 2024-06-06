"use server";

import { decodeUser } from "@/app/data-fetching";
import { claimEventRewards } from "@/lib/server/cosmo/rewards";
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

  const result = await claimEventRewards(user.accessToken);
  if (result) {
    return {
      status: "success",
      data: result,
    } satisfies ActionResultSuccess<boolean>;
  }

  return {
    status: "error",
    error: "Could not claim event rewards",
  } satisfies ActionResultError;
}
