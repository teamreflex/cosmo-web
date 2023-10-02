import { fetchSelectedArtist as redisSelectedArtist } from "@/lib/server/cache";
import { cache } from "react";

export const fetchSelectedArtist = cache(
  async (userId: number) => await redisSelectedArtist(userId)
);
