import type { CosmoArtistSchema } from "../src/schema/artists";
import type { RefreshTokenResultSchema } from "../src/schema/auth";
import type { UpcomingGravitySchema } from "../src/schema/gravity";
import type {
  CosmoByNicknameSchema,
  CosmoUserProfileSchema,
} from "../src/schema/user";
import type { CosmoArtistWithMembersBFF } from "../src/types/artists";
import type { CosmoPastGravity, CosmoPollChoices } from "../src/types/gravity";
import type {
  CosmoObjektMetadataV1,
  CosmoObjektMetadataV3,
} from "../src/types/metadata";
import type { ObjektSummariesResponse } from "../src/types/objekts";
import type { AuthTicket, QueryTicket } from "../src/types/qr-auth";
import type { CosmoSearchResult } from "../src/types/user";

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
] satisfies (typeof CosmoArtistSchema.Type)[];

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
} satisfies typeof UpcomingGravitySchema.Type;

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
    // real past gravities omit `id` on body items, despite COSMO's types,
    // and pre-2024 ones use align "start"
    { type: "heading", text: "Results", align: "center" },
    { type: "text", text: "1. Sparkle", align: "start" },
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
    // 2022-era poll: no artistId or localized titles, and combination
    // results use the single-poll votedChoice shape instead of votedSlots
    {
      id: 2,
      artist: "tripleS",
      pollIdOnChain: 1,
      gravityId: 99,
      type: "combination-poll",
      indexInGravity: 1,
      title: "Legacy Poll",
      imageUrl: "https://static.cosmo.fans/poll-legacy.png",
      startDate: "2022-09-01T00:00:00.000Z",
      endDate: "2022-09-08T00:00:00.000Z",
      revealDate: "2022-09-09T00:00:00.000Z",
      finalized: true,
      result: {
        totalComoUsed: 1399,
        voteResults: [
          {
            rank: 1,
            votedChoice: {
              choiceName: "AAA:S7 KRE:S1",
              choiceImageUrl: "https://static.cosmo.fans/choice-legacy.png",
              comoUsed: 1399,
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
    selectedContent: [
      {
        choiceId: "choice-1",
        // polygon-era polls omit content.id (and selectContent entirely)
        content: {
          type: "image",
          imageUrl: "https://static.cosmo.fans/choice-1-selected.png",
          title: "Choice 1",
          description: "First choice",
        },
      },
    ],
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

// combination polls use slot-based view metadata and single-style choices
// (mirrors the 2022-2023 grand gravity polls, the only combination polls)
export const combinationPollChoices = {
  id: 9,
  artist: "tripleS",
  pollIdOnChain: 5,
  gravityId: 99,
  type: "combination-poll",
  indexInGravity: 0,
  title: "Combination Poll",
  imageUrl: "https://static.cosmo.fans/poll-combo.png",
  startDate: "2022-09-01T00:00:00.000Z",
  endDate: "2022-09-08T00:00:00.000Z",
  revealDate: "2022-09-09T00:00:00.000Z",
  finalized: true,
  pollViewMetadata: {
    title: "Combination Poll",
    background: null,
    slots: [
      {
        id: "aaa",
        name: "AAA",
        title: "Pick an AAA member",
        description: "Pick from the members below",
        backgroundImageUrl: "https://static.cosmo.fans/slot-aaa.jpeg",
      },
    ],
    slotChoices: [
      {
        id: "seoyeon",
        name: "SeoYeon",
        alias: "S1",
        roundImageUrl: "https://static.cosmo.fans/slot-choice-s1.png",
        slotCardImageUrl: "https://static.cosmo.fans/slot-card-s1.png",
      },
    ],
    choiceIdToSlotChoicesMapTable: [
      {
        choiceId: "S1+S7",
        slotIds: ["aaa", "kre"],
        slotChoiceIds: ["seoyeon", "nakyoung"],
      },
    ],
  },
  choices: [
    {
      id: "combo-choice-1",
      title: "S1+S7",
      description: "SeoYeon and NaKyoung",
      txImageUrl: "https://static.cosmo.fans/combo-choice-1.png",
    },
  ],
} satisfies CosmoPollChoices;

export const credentials = {
  accessToken: "new-access-token",
  refreshToken: "new-refresh-token",
} satisfies typeof RefreshTokenResultSchema.Type;

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
} satisfies typeof CosmoByNicknameSchema.Type;

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
} satisfies typeof CosmoUserProfileSchema.Type;

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
