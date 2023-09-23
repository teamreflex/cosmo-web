import { COSMO_ENDPOINT, ValidArtist } from "./common";

export type CosmoArtist = {
  name: string;
  title: string;
  logoImageUrl: string;
  contracts: {
    Como: string;
    Objekt: string;
    ObjektMinter: string;
    Governor: string;
    CommunityPool: string;
    ComoMinter: string;
  };
};

type CosmoArtistsResult = {
  artists: CosmoArtist[];
};

/**
 * Fetch all artists within Cosmo.
 * @returns Promise<CosmoArtist[]>
 */
export async function fetchArtists() {
  const res = await fetch(`${COSMO_ENDPOINT}/artist/v1`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch artists");
  }

  const { artists }: CosmoArtistsResult = await res.json();
  return artists;
}

export type CosmoMember = {
  name: string;
  artist: ValidArtist;
  units: string[];
  alias: string;
  profileImageUrl: string;
  mainObjektImageUrl: string;
  order: number;
};

export type CosmoArtistWithMembers = CosmoArtist & {
  members: CosmoMember[];
};

/**
 * Fetch a single artist with its members.
 * @returns Promise<CosmoArtist[]>
 */
export async function fetchArtist(artist: ValidArtist) {
  const res = await fetch(`${COSMO_ENDPOINT}/artist/v1/${artist}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch artist");
  }

  const { artist: result }: { artist: CosmoArtistWithMembers } =
    await res.json();
  return result;
}

export function isValidArtist(artist: string): artist is ValidArtist {
  return artist === "artms" || artist === "tripleS";
}

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

type CosmoNewsSectionBannerContent = {
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

type CosmoNewsSectionFeedContent = {
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

type CosmoNewsSectionExclusiveContent = {
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

const testNews = {
  sections: [
    {
      artist: "artms",
      type: "bar",
      contents: [],
    },
    {
      artist: "artms",
      type: "banner",
      contents: [
        {
          id: 13,
          url: "https://www.youtube.com/watch?v=Wga0MbOCmEA",
          createdAt: "2023-08-28T06:02:07.354Z",
          label: "release",
          order: 2,
          body: "Watch OEC's Europe Tour behind video!",
          imageUrl:
            "https://static.cosmo.fans/admin/uploads/f748137d-b211-4b58-ba21-7cd127aa2be0.jpg",
        },
        {
          id: 3,
          url: "https://naver.me/583ZIzfy",
          createdAt: "2023-08-16T06:27:20.896Z",
          label: "release",
          order: 3,
          body: "Check out OEC’s behind photos",
          imageUrl:
            "https://s3.ap-northeast-2.amazonaws.com/static.cosmo.fans/images/main-prod/230817/ARTMS_03.jpg",
        },
        {
          id: 2,
          url: "https://youtube.com/playlist?list=PL0KXLyuvd3EDbAdc7UYOUoOK-6n5rlVYZ",
          createdAt: "2023-08-16T06:27:20.880Z",
          label: "release",
          order: 2,
          body: "Watch ARTMS’ 'Explore Log'",
          imageUrl:
            "https://s3.ap-northeast-2.amazonaws.com/static.cosmo.fans/images/main-prod/230817/ARTMS_02.jpg",
        },
        {
          id: 1,
          url: "https://www.melon.com/album/detail.htm?albumId=11283575",
          createdAt: "2023-08-16T06:27:20.866Z",
          label: "release",
          order: 1,
          body: "Listen to OEC’s <Version Up>",
          imageUrl:
            "https://s3.ap-northeast-2.amazonaws.com/static.cosmo.fans/images/main-prod/230817/ARTMS_01.jpg",
        },
      ],
    },
    {
      artist: "artms",
      type: "feed",
      title: "Today’s Atmosphere",
      contents: [
        {
          id: 295,
          url: "https://www.youtube.com/@official_artms",
          createdAt: "2023-09-06T08:58:04.407Z",
          artist: "ARTMS",
          logoImageUrl: "https://static.cosmo.fans/assets/artms-logo.png",
          body: "ODD EYE CIRCLE's whereabouts",
          imageUrls: [
            "https://static.cosmo.fans/admin/uploads/66987575-ea19-4d1b-b0e6-d0adc7b9425c.jpg",
            "https://static.cosmo.fans/admin/uploads/7e29b0e7-eaaf-4966-8791-e2065820df63.jpg",
            "https://static.cosmo.fans/admin/uploads/a8e24b8d-320f-417e-850d-35b325ede8f5.jpg",
            "https://static.cosmo.fans/admin/uploads/62bfd022-d4a0-4c3e-9850-20a181456fef.jpg",
          ],
        },
      ],
    },
    {
      artist: "artms",
      type: "exclusive",
      title: "COSMO Exclusive",
      contents: [
        {
          id: 5,
          url: "https://youtu.be/UDxID0_A9x4",
          createdAt: "2023-07-11T01:09:25.477Z",
          title: "ODD EYE CIRCLE ‘Air Force One' MV | ARTMS",
          body: "#KimLip #JinSoul #Choerry #Air Force One",
          thumbnailImageUrl:
            "https://static.cosmo.fans/uploads/assets/production/odd-eye-circle-mv-thumnail.jpg",
          nativeVideoUrl: "",
        },
      ],
    },
    {
      artist: "artms",
      type: "event",
      title: "Event",
      contents: [],
    },
  ],
};

export async function fetchNews(token: string, artist: ValidArtist) {
  const res = await fetch(`${COSMO_ENDPOINT}/news/v1?artist=${artist}`, {
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

  // return testNews.sections as CosmoNewsSection[];

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
