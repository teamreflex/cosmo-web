import "server-only";
import {
  COSMO_ENDPOINT,
  CosmoNewsFeedResult,
  CosmoNewsSection,
  CosmoNewsSectionExclusiveContent,
  CosmoNewsSectionFeedContent,
  ValidArtist,
} from "@/lib/universal/cosmo";

type CosmoNewsResult = {
  sections: CosmoNewsSection[];
};

/**
 * Get news on the home page.
 */
export async function fetchHomeNews(token: string, artist: ValidArtist) {
  const params = new URLSearchParams({
    artist,
  });

  const res = await fetch(`${COSMO_ENDPOINT}/news/v1?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch news");
  }

  const { sections }: CosmoNewsResult = await res.json();
  return sections;
}

/**
 * Fetch the "todays atmosphere" feed.
 */
export async function fetchFeed(
  token: string,
  artist: ValidArtist,
  startAfter: number = 0
) {
  const params = new URLSearchParams({
    artist,
    start_after: startAfter.toString(),
    limit: "10",
  });

  const res = await fetch(
    `${COSMO_ENDPOINT}/news/v1/feed?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch news feed");
  }

  return (await res.json()) as CosmoNewsFeedResult<CosmoNewsSectionFeedContent>;
}

/**
 * Fetch the "cosmo exclusive" feed.
 */
export async function fetchExclusive(
  token: string,
  artist: ValidArtist,
  startAfter: number = 0
) {
  const params = new URLSearchParams({
    artist,
    start_after: startAfter.toString(),
    limit: "10",
  });

  const res = await fetch(
    `${COSMO_ENDPOINT}/news/v1/exclusive?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch news exclusive");
  }

  return (await res.json()) as CosmoNewsFeedResult<CosmoNewsSectionExclusiveContent>;
}
