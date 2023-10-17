import { fetchSelectedArtist as redisSelectedArtist } from "@/lib/server/cache";
import { fetchHomeNews } from "@/lib/server/cosmo";
import { cache } from "react";

export const fetchSelectedArtist = cache(
  async (userId: number) => await redisSelectedArtist(userId)
);

export const fetchNewsForSelectedArtist = cache(
  async (userId: number, token: string) => {
    const artist = await redisSelectedArtist(userId);
    return await fetchHomeNews(token, artist ?? "artms");
  }
);
