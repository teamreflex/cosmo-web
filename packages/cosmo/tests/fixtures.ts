import type {
  CosmoArtist,
  CosmoArtistWithMembersBFF,
} from "../src/types/artists";
import type { RefreshTokenResult } from "../src/types/auth";
import type {
  CosmoPastGravity,
  CosmoPollChoices,
  CosmoUpcomingGravity,
} from "../src/types/gravity";
import type {
  CosmoObjektMetadataV1,
  CosmoObjektMetadataV3,
} from "../src/types/metadata";
import type { ObjektSummariesResponse } from "../src/types/objekts";
import type { AuthTicket, QueryTicket } from "../src/types/qr-auth";
import type {
  CosmoByNickname,
  CosmoSearchResult,
  CosmoUserProfile,
} from "../src/types/user";

const contracts = {
  Como: "0x0",
  Objekt: "0x1",
  ObjektMinter: "0x2",
  Governor: "0x3",
  CommunityPool: "0x4",
  ComoMinter: "0x5",
};

export const artists = [
  {
    name: "tripleS",
    title: "tripleS",
    fandomName: "WAV",
    logoImageUrl: "https://static.cosmo.fans/triples.png",
    contracts,
  },
  {
    name: "artms",
    title: "ARTMS",
    fandomName: "OURII",
    logoImageUrl: "https://static.cosmo.fans/artms.png",
    contracts,
  },
] satisfies CosmoArtist[];

export const artistBff = {
  name: "tripleS",
  id: "tripleS",
  title: "tripleS",
  fandomName: "WAV",
  logoImageUrl: "https://static.cosmo.fans/triples.png",
  primaryImageUrl: "https://static.cosmo.fans/triples-primary.png",
  category: "girl-group",
  wasReleased: true,
  comoTokenId: 1,
  contracts,
  artistMembers: [
    {
      id: 1,
      name: "Seoyeon",
      units: "AAA,Krystal Eyes",
      alias: "S1",
      profileImageUrl: "https://static.cosmo.fans/seoyeon.png",
      backgroundImageUrl: "https://static.cosmo.fans/seoyeon-bg.png",
      order: 1,
      createdAt: "2022-10-28T00:00:00.000Z",
      updatedAt: "2022-10-28T00:00:00.000Z",
      mainObjektImageUrl: null,
      artistId: "tripleS",
      primaryColorHex: "#8A2BE2",
    },
  ],
  snsLink: {
    discord: { name: "discord", address: "https://discord.gg/triples" },
    instagram: {
      name: "instagram",
      address: "https://instagram.com/triplescosmos",
    },
    twitter: { name: "twitter", address: "https://twitter.com/triplescosmos" },
    youtube: { name: "youtube", address: "https://youtube.com/@triplescosmos" },
    tiktok: { name: "tiktok", address: "https://tiktok.com/@triplescosmos" },
  },
} satisfies CosmoArtistWithMembersBFF;

export const upcomingGravity = {
  id: 100,
  artist: "tripleS",
  title: "Gravity Title",
  description: "A gravity",
  type: "event-gravity",
  pollType: "single-poll",
  bannerImageUrl: "https://static.cosmo.fans/gravity.png",
  entireStartDate: "2026-01-01T00:00:00.000Z",
  entireEndDate: "2026-01-08T00:00:00.000Z",
  body: [],
  contractOutlink: "https://polygonscan.com/address/0x0",
  polls: [],
} satisfies CosmoUpcomingGravity;

export const pastGravity = {
  id: 99,
  artist: "tripleS",
  title: "Past Gravity",
  description: "A finalized gravity",
  type: "event-gravity",
  pollType: "single-poll",
  bannerImageUrl: "https://static.cosmo.fans/gravity-past.png",
  entireStartDate: "2025-01-01T00:00:00.000Z",
  entireEndDate: "2025-01-08T00:00:00.000Z",
  body: [
    { type: "heading", text: "Results", align: "center", id: "heading-1" },
    {
      type: "image",
      id: "image-1",
      imageUrl: "https://static.cosmo.fans/gravity-past-body.png",
      height: 320,
    },
  ],
  contractOutlink: "https://polygonscan.com/address/0x0",
  polls: [
    {
      id: 8,
      artist: "tripleS",
      artistId: "tripleS",
      pollIdOnChain: 4,
      gravityId: 99,
      type: "single-poll",
      indexInGravity: 0,
      title: "Final Poll",
      imageUrl: "https://static.cosmo.fans/poll-final.png",
      startDate: "2025-01-01T00:00:00.000Z",
      endDate: "2025-01-08T00:00:00.000Z",
      revealDate: "2025-01-09T00:00:00.000Z",
      titleKo: "최종 투표",
      titleEn: "Final Poll",
      titleJa: "最終投票",
      titleZhCn: "最终投票",
      titleZhTw: "最終投票",
      finalized: true,
      result: {
        totalComoUsed: 1000,
        voteResults: [
          {
            rank: 1,
            votedChoice: {
              choiceName: "Choice 1",
              choiceImageUrl: "https://static.cosmo.fans/choice-1.png",
              comoUsed: 600,
            },
          },
        ],
      },
    },
  ],
  result: {
    totalComoUsed: 1000,
    resultImageUrl: "https://static.cosmo.fans/gravity-past-result.png",
    resultTitle: "Choice 1 wins",
  },
  leaderboard: {
    userRanking: [
      {
        rank: 1,
        totalComoUsed: 600,
        user: {
          nickname: "Kairu",
          address: "0xabc",
          profileImageUrl: "https://static.cosmo.fans/kairu.png",
        },
      },
    ],
  },
} satisfies CosmoPastGravity;

export const pollChoices = {
  id: 7,
  artist: "tripleS",
  pollIdOnChain: 3,
  gravityId: 100,
  type: "single-poll",
  indexInGravity: 0,
  title: "Poll Title",
  imageUrl: "https://static.cosmo.fans/poll.png",
  startDate: "2026-01-01T00:00:00.000Z",
  endDate: "2026-01-08T00:00:00.000Z",
  revealDate: "2026-01-09T00:00:00.000Z",
  finalized: false,
  pollViewMetadata: {
    title: "Poll Title",
    background: null,
    defaultContent: {
      type: "image",
      imageUrl: "https://static.cosmo.fans/poll-default.png",
      title: "Default",
      description: "Default content",
    },
    selectedContent: [],
    choiceViewType: "vertical",
    selectContent: [],
  },
  choices: [
    {
      id: "choice-1",
      title: "Choice 1",
      description: "First choice",
      txImageUrl: "https://static.cosmo.fans/choice-1.png",
    },
  ],
} satisfies CosmoPollChoices;

export const combinationPollChoices = {
  id: 9,
  artist: "tripleS",
  pollIdOnChain: 5,
  gravityId: 99,
  type: "combination-poll",
  indexInGravity: 0,
  title: "Combination Poll",
  imageUrl: "https://static.cosmo.fans/poll-combo.png",
  startDate: "2026-01-01T00:00:00.000Z",
  endDate: "2026-01-08T00:00:00.000Z",
  revealDate: "2026-01-09T00:00:00.000Z",
  finalized: false,
  pollViewMetadata: {
    title: "Combination Poll",
    background: null,
    defaultContent: {
      type: "image",
      imageUrl: "https://static.cosmo.fans/poll-combo-default.png",
      title: "Default",
      description: "Default content",
    },
    selectedContent: [],
    choiceViewType: "horizontal",
    selectContent: [],
  },
  choices: [
    {
      id: "combo-choice-1",
      txImageUrl: "https://static.cosmo.fans/combo-choice-1.png",
      txImagePairUrls: [
        "https://static.cosmo.fans/combo-choice-1-a.png",
        "https://static.cosmo.fans/combo-choice-1-b.png",
      ],
    },
  ],
} satisfies CosmoPollChoices;

export const credentials = {
  accessToken: "new-access-token",
  refreshToken: "new-refresh-token",
} satisfies RefreshTokenResult;

export const searchResult = {
  hasNext: false,
  nextStartAfter: null,
  results: [
    {
      id: 42,
      nickname: "Kairu",
      profileImageUrl: "https://static.cosmo.fans/kairu.png",
      address: "0xabc",
      userProfiles: [],
    },
  ],
} satisfies CosmoSearchResult;

export const byNickname = {
  nickname: "Kairu",
  address: "0xabc",
  profileImageUrl: "https://static.cosmo.fans/kairu.png",
  guid: "3f6c9f0e-0000-0000-0000-000000000000",
} satisfies CosmoByNickname;

export const userProfile = {
  id: 42,
  nickname: "Kairu",
  address: "0xabc",
  profileImageUrl: "https://static.cosmo.fans/kairu.png",
  fandomName: "WAV",
  followDurationDays: 100,
  currentStreak: 10,
  statusMessage: null,
  createdAt: "2022-10-28T00:00:00.000Z",
} satisfies CosmoUserProfile;

export const authTicket = {
  expireAt: "2026-01-01T00:00:00.000Z",
  ticket: "ticket-value",
} satisfies AuthTicket;

export const waitingTicket = {
  status: "wait_for_user_action",
  ticketRemainingMs: 60_000,
} satisfies QueryTicket;

export const metadataV1 = {
  name: "Seoyeon 101Z",
  description: "tripleS, the idol of all possibilities",
  image: "https://imagedelivery.net/objekt/front/4x",
  background_color: "8A2BE2",
  objekt: {
    collectionId: "Atom01 Seoyeon 101Z",
    season: "Atom01",
    member: "Seoyeon",
    collectionNo: "101Z",
    class: "First",
    artists: ["tripleS"],
    thumbnailImage: "https://imagedelivery.net/objekt/front/thumbnail",
    frontImage: "https://imagedelivery.net/objekt/front/4x",
    backImage: "https://imagedelivery.net/objekt/back/4x",
    accentColor: "#8A2BE2",
    backgroundColor: "#8A2BE2",
    textColor: "#FFFFFF",
    comoAmount: 1,
    tokenId: "1234",
    objektNo: 1,
    tokenAddress: "0x99bb83ae9bb0c0a6be865cacf67760947f91cb70",
    transferable: true,
  },
} satisfies CosmoObjektMetadataV1;

export const metadataV3 = {
  name: "Atom01 Seoyeon 101Z #1",
  description: "tripleS, the idol of all possibilities",
  image: "https://imagedelivery.net/objekt/front/4x",
  background_color: "8A2BE2",
  attributes: [
    { trait_type: "Artist", value: "tripleS" },
    { trait_type: "Class", value: "First" },
    { trait_type: "Member", value: "Seoyeon" },
    { trait_type: "Season", value: "Atom01" },
    { trait_type: "Collection", value: "101Z" },
  ],
} satisfies CosmoObjektMetadataV3;

export const objektSummaries = {
  collectionCount: 1,
  collections: [
    {
      collection: {
        collectionId: "Atom01 Seoyeon 101Z",
        artistName: "tripleS",
        frontMedia: null,
        bandImageUrl: null,
      },
    },
  ],
} satisfies ObjektSummariesResponse;
