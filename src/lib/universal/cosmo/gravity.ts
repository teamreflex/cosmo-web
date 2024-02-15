import { ValidArtist } from "@/lib/universal/cosmo/common";

export type CosmoGravityType = "event-gravity" | "grand-gravity";
type CosmoPollType = "single-poll" | "combination-poll";

export type CosmoBodySpacing = {
  type: "spacing";
  height: number;
};

export type CosmoBodyHeading = {
  type: "heading";
  text: string;
  align: "left" | "center" | "right";
  id: string;
};

export type CosmoBodyImage = {
  type: "image";
  id: string;
  imageUrl: string;
  height: number;
};

export type CosmoBodyText = {
  type: "text";
  text: string;
  align: "left" | "center" | "right";
  id: string;
};

export type CosmoBodyVideo = {
  type: "video";
  videoUrl: string;
  thumbnailImageUrl: string;
  allowFullScreen: boolean;
  useController: boolean;
  id: string;
};

type CosmoBodyItem =
  | CosmoBodySpacing
  | CosmoBodyHeading
  | CosmoBodyImage
  | CosmoBodyText
  | CosmoBodyVideo;

export type CosmoSinglePollVoteResult = {
  rank: number;
  votedChoice: {
    choiceName: string;
    choiceImageUrl: string;
    comoUsed: number;
  };
};

type CosmoPollCommon<PollType extends CosmoPollType> = {
  id: number;
  artist: ValidArtist;
  pollIdOnChain: number;
  gravityId: number;
  type: PollType;
  indexInGravity: number;
  title: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
  revealDate: string;
};

type CosmoSinglePollFinalized = CosmoPollCommon<"single-poll"> & {
  finalized: true;
  result: {
    totalComoUsed: number;
    voteResults: CosmoSinglePollVoteResult[];
  };
};

type CosmoSinglePollUpcoming = CosmoPollCommon<"single-poll"> & {
  finalized: false;
};

type CosmoCombinationPollVoteSlot = {
  slotName: string;
  slotChoiceName: string;
  slotChoiceCardImageUrl: string;
  comoUsed: number;
};

export type CosmoCombinationPollVoteResult = {
  rank: number;
  votedSlots: CosmoCombinationPollVoteSlot[];
};

type CosmoCombinationPollFinalized = CosmoPollCommon<"combination-poll"> & {
  finalized: true;
  result: {
    totalComoUsed: number;
    voteResults: CosmoCombinationPollVoteResult[];
  };
};

type CosmoCombinationPollUpcoming = CosmoPollCommon<"combination-poll"> & {
  finalized: false;
};

export type CosmoPollFinalized =
  | CosmoSinglePollFinalized
  | CosmoCombinationPollFinalized;
type CosmoPollUpcoming = CosmoSinglePollUpcoming | CosmoCombinationPollUpcoming;

type CosmoLeaderboardItem = {
  rank: number;
  totalComoUsed: number;
  user: {
    nickname: string;
    address: string;
    profileImageUrl: string;
  };
};

// TODO: check if past, upcoming and ongoing are the same
export type CosmoPastGravity = {
  id: number;
  artist: ValidArtist;
  title: string;
  description: string;
  type: CosmoGravityType;
  pollType: CosmoPollType;
  bannerImageUrl: string;
  entireStartDate: string;
  entireEndDate: string;
  body: CosmoBodyItem[];
  polls: CosmoPollFinalized[];
  result: {
    totalComoUsed: number;
    resultImageUrl: string;
    resultTitle: string;
  };
  leaderboard: {
    userRanking: CosmoLeaderboardItem[];
  };
};

export type CosmoUpcomingGravity = {
  id: number;
  artist: ValidArtist;
  title: string;
  description: string;
  type: CosmoGravityType;
  pollType: CosmoPollType;
  bannerImageUrl: string;
  entireStartDate: string;
  entireEndDate: string;
  body: CosmoBodyItem[];
  polls: CosmoPollUpcoming[];
};

export type CosmoOngoingGravity = {
  id: number;
  artist: ValidArtist;
  title: string;
  description: string;
  type: CosmoGravityType;
  pollType: CosmoPollType;
  bannerImageUrl: string;
  entireStartDate: string;
  entireEndDate: string;
  body: CosmoBodyItem[];
  polls: CosmoPollUpcoming[];
};

export type CosmoGravity =
  | CosmoPastGravity
  | CosmoUpcomingGravity
  | CosmoOngoingGravity;

type CosmoMyGravityVote = {
  choiceId: string;
  voteTo: string;
  voteImageUrl?: string;
  comoUsed: number;
  at: string;
};

type CosmoMyGravityVoteStatus = {
  pollId: number;
  comoUsed: number;
  votes: CosmoMyGravityVote[];
};

export type CosmoMyGravityResult = {
  rank: number;
  totalComoUsed: number;
  voteStatuses: CosmoMyGravityVoteStatus[];
};

type PollDefaultContentImage = {
  type: "image";
  imageUrl: string;
  title: string;
  description: string;
};

export type PollViewDefaultContent = PollDefaultContentImage;

type PollSelectedContentImage = {
  choiceId: string;
  content: {
    type: "image";
    imageUrl: string;
    title: string;
    description: string;
  };
};

type PollViewSelectedContent = PollSelectedContentImage;

export type PollChoice = {
  id: string;
  title: string;
  description: string;
  txImageUrl: string;
};

type CosmoSinglePollChoices = {
  id: number;
  artist: ValidArtist;
  pollIdOnChain: number;
  gravityId: number;
  type: "single-poll";
  indexInGravity: number;
  title: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
  revealDate: string;
  finalized: false;
  pollViewMetadata: {
    title: string;
    background: null;
    defaultContent: PollViewDefaultContent;
    selectedContent: PollViewSelectedContent[];
    choiceViewType: "vertical" | "horizontal";
  };
  choices: PollChoice[];
};

type CosmoCombinationPollChoices = {
  id: number;
  artist: ValidArtist;
  pollIdOnChain: number;
  gravityId: number;
  type: "combination-poll";
  indexInGravity: number;
  title: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
  revealDate: string;
  finalized: false;
  pollViewMetadata: {
    title: string;
    background: null;
    defaultContent: PollViewDefaultContent;
    selectedContent: PollViewSelectedContent[];
    choiceViewType: "vertical" | "horizontal";
  };
  choices: PollChoice[];
};

export type CosmoPollChoices =
  | CosmoSinglePollChoices
  | CosmoCombinationPollChoices;

export type FabricateVotePayload = {
  pollId: number;
  choiceId: string;
  comoAmount: number;
};

export type CosmoGravityVoteCalldata = {
  artist: ValidArtist;
  pollId: number;
  pollIdOnChain: number;
  candidateId: number;
  hash: string;
  salt: string;
  signature: string;
};
