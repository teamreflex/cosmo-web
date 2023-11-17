import {
  cacheArtists,
  fetchSelectedArtist as redisSelectedArtist,
} from "@/lib/server/cache";
import { fetchHomeNews } from "@/lib/server/cosmo";
import { cache } from "react";
import { getUser } from "./api/common";
import { remember } from "@/lib/server/cache/common";
import { fetchObjektLists } from "@/lib/server/objekts";

export const fetchSelectedArtist = cache(
  async (userId: number) => await redisSelectedArtist(userId)
);

export const fetchNewsForSelectedArtist = cache(
  async (userId: number, token: string) => {
    const artist = (await redisSelectedArtist(userId)) ?? "artms";
    return await remember(
      artist,
      60 * 15, // 15 minutes
      () => fetchHomeNews(token, artist)
    );
  }
);

export const decodeUser = cache(async () => {
  const auth = await getUser();
  return auth.success ? auth.user : undefined;
});

export const fetchArtists = cache(async () => cacheArtists());

export const fetchObjektListsForUser = cache(async (address?: string) =>
  address ? await fetchObjektLists(address) : undefined
);
