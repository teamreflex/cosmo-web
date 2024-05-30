import { ValidArtist } from "@/lib/universal/cosmo/common";
import { cosmo } from "../http";
import {
  CosmoActivityMyObjektResult,
  CosmoActivityWelcomeResult,
} from "@/lib/universal/cosmo/activity";
import { v4 } from "uuid";

/**
 * Fetch a user's follow length.
 */
export async function fetchActivityWelcome(
  token: string,
  artistName: ValidArtist
) {
  return await cosmo<CosmoActivityWelcomeResult>(`/bff/v1/activity/welcome`, {
    query: {
      artistName,
      tid: v4(),
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-cache",
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
