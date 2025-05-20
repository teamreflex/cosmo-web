import { z } from "zod";
import type { CosmoArtist } from "./artists";
import { type ValidArtist, validArtists } from "./common";
import { parse } from "../parsers";

type CosmoNewsSectionBar = {
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
  url: string | null;
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
  nativeVideoUrl: string | null;
};

export type CosmoNewsSectionRekord = {
  type: "rekord";
  artist: ValidArtist;
  contents: CosmoNewsSectionRekordContent[];
};
type CosmoNewsSectionRekordContentArtistMember = {
  id: number;
  name: string;
  profileImage: string;
};
type CosmoNewsSectionRekordContentArtist = {
  name: string;
  title: string;
  profileImage: string;
};
type CosmoNewsSectionRekordContent = {
  id: number;
  totalLikeCount: number;
  createdAt: string;
  updatedAt: string;
  expiredAt: string;
  isExpired: boolean;
  isBlinded: boolean;
  isDeleted: boolean;
  isArchived: boolean;
  isLikedPost: boolean;
  isReportedPost: boolean;
  owner: {
    id: number;
    nickname: string;
  };
  artistMembers: CosmoNewsSectionRekordContentArtistMember[];
  artist: CosmoNewsSectionRekordContentArtist;
  image: {
    thumbnail: string;
    large: string;
  };
};

export type CosmoNewsSection =
  | CosmoNewsSectionBar
  | CosmoNewsSectionBanner
  | CosmoNewsSectionFeed
  | CosmoNewsSectionExclusive
  | CosmoNewsSectionRekord;

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

export function isRekordSection(
  section: CosmoNewsSection
): section is CosmoNewsSectionRekord {
  return section.type === "rekord";
}

export type CosmoNewsFeedResult<TPostType> = {
  hasNext: boolean;
  total: number;
  nextStartAfter: string;
  results: TPostType[];
};

export type CosmoBFFNewsFeedResult<TPostType> = {
  count: number;
  sets: TPostType[];
};

type CosmoBFFNewsFeedItemImage = {
  thumbnail: string;
  original: string;
};

export type CosmoBFFNewsFeedItem = {
  data: {
    activeAt: string;
    updatedAt: string;
    createdAt: string;
    artistMembers: unknown[];
    artist: string;
    body: string;
    id: number;
    totalLikeCount: number;
    url: string;
  };
  artist: CosmoArtist;
  images: CosmoBFFNewsFeedItemImage[];
  isLiked: boolean;
};

const bffNewsSchema = z.object({
  artistName: z.enum(validArtists),
  page: z.coerce.number().optional().default(1),
});

/**
 * Parse BFF news params with default fallback.
 */
export function parseBffNewsParams(params: URLSearchParams) {
  return parse(
    bffNewsSchema,
    {
      artistName: params.get("artistName"),
      page: params.get("page"),
    },
    {
      artistName: "artms",
      page: 1,
    }
  );
}
