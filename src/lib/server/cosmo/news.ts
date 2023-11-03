import { COSMO_ENDPOINT, ValidArtist } from "./common";

export type CosmoNewsSectionBar = {
  type: "bar";
  artist: ValidArtist;
  contents: [];
};

export type CosmoNewsSectionBanner = {
  type: "banner";
  artist: ValidArtist;
  contents: CosmoNewsSectionBannerContent[];
};
export type CosmoNewsSectionBannerContent = {
  id: number;
  url: string;
  createdAt: string;
  label: "release" | "event" | "notice";
  order: number;
  body: string;
  imageUrl: string;
};

export type CosmoNewsSectionFeed = {
  type: "feed";
  artist: ValidArtist;
  title: string;
  contents: CosmoNewsSectionFeedContent[];
};
export type CosmoNewsSectionFeedContent = {
  id: number;
  url: string;
  createdAt: string;
  artist: ValidArtist;
  logoImageUrl: string;
  body: string;
  imageUrls: string[];
};

export type CosmoNewsSectionExclusive = {
  type: "exclusive";
  artist: ValidArtist;
  title: string;
  contents: CosmoNewsSectionExclusiveContent[];
};
export type CosmoNewsSectionExclusiveContent = {
  id: number;
  url: string;
  createdAt: string;
  title: string;
  body: string;
  thumbnailImageUrl: string;
  nativeVideoUrl: string;
};

type CosmoNewsSection =
  | CosmoNewsSectionBar
  | CosmoNewsSectionBanner
  | CosmoNewsSectionFeed
  | CosmoNewsSectionExclusive;

type CosmoNewsResult = {
  sections: CosmoNewsSection[];
};

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

export function isBarSection(
  section: CosmoNewsSection
): section is CosmoNewsSectionBar {
  return section.type === "bar";
}

export function isBannerSection(
  section: CosmoNewsSection
): section is CosmoNewsSectionBanner {
  return section.type === "banner";
}

export function isFeedSection(
  section: CosmoNewsSection
): section is CosmoNewsSectionFeed {
  return section.type === "feed";
}

export function isExclusiveSection(
  section: CosmoNewsSection
): section is CosmoNewsSectionExclusive {
  return section.type === "exclusive";
}

export type CosmoNewsFeedResult<TPostType> = {
  hasNext: boolean;
  total: number;
  nextStartAfter: string;
  results: TPostType[];
};

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
