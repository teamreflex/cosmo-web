import "server-only";
import {
  CosmoNewsFeedResult,
  CosmoNewsSection,
  CosmoNewsSectionExclusiveContent,
  CosmoNewsSectionFeedContent,
} from "@/lib/universal/cosmo/news";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { cosmo } from "../http";

type CosmoNewsResult = {
  sections: CosmoNewsSection[];
};

/**
 * Get news on the home page.
 * Cached for 15 minutes.
 */
export async function fetchHomeNews(token: string, artist: ValidArtist) {
  return await cosmo<CosmoNewsResult>(`/news/v1`, {
    query: { artist },
    headers: {
      Authorization: `Bearer ${token}`,
    },
    next: {
      tags: ["home-news", artist],
      revalidate: 60 * 15, // 15 minutes
    },
  }).then((res) => res.sections);
}

/**
 * Fetch the "todays atmosphere" feed.
 * Cached for 15 minutes.
 */
export async function fetchFeed(
  token: string,
  artist: ValidArtist,
  startAfter: number = 0
) {
  return await cosmo<CosmoNewsFeedResult<CosmoNewsSectionFeedContent>>(
    `/news/v1/feed`,
    {
      query: {
        artist,
        start_after: startAfter.toString(),
        limit: "10",
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
      next: {
        tags: ["news", "feed", artist],
        revalidate: 60 * 15, // 15 minutes
      },
    }
  );
}

/**
 * Fetch the "cosmo exclusive" feed.
 * Cached for 15 minutes.
 */
export async function fetchExclusive(
  token: string,
  artist: ValidArtist,
  startAfter: number = 0
) {
  return await cosmo<CosmoNewsFeedResult<CosmoNewsSectionExclusiveContent>>(
    `/news/v1/exclusive`,
    {
      query: {
        artist,
        start_after: startAfter.toString(),
        limit: "10",
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
      next: {
        tags: ["news", "exclusive", artist],
        revalidate: 60 * 15, // 15 minutes
      },
    }
  );
}
