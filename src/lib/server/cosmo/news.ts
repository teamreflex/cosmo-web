import "server-only";
import {
  CosmoBFFNewsFeedItem,
  CosmoBFFNewsFeedResult,
  CosmoNewsFeedResult,
  CosmoNewsSection,
  CosmoNewsSectionExclusiveContent,
} from "@/lib/universal/cosmo/news";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { cosmo } from "../http";
import { randomUUID } from "crypto";

type CosmoNewsResult = {
  sections: CosmoNewsSection[];
};

/**
 * Get news on the home page.
 */
export async function fetchHomeNews(token: string, artist: ValidArtist) {
  return await cosmo<CosmoNewsResult>(`/news/v1`, {
    query: { artist },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then((res) => res.sections);
}

/**
 * Fetch the "cosmo exclusive" feed.
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
    }
  );
}

/**
 * Get the bff news feed.
 */
export async function fetchFeedBff(
  token: string,
  artistName: ValidArtist,
  page: number = 1
) {
  return await cosmo<CosmoBFFNewsFeedResult<CosmoBFFNewsFeedItem>>(
    `/bff/v1/news/feed`,
    {
      query: {
        artistName,
        page: page.toString(),
        size: "10",
        tid: randomUUID(),
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}
