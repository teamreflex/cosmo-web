import { ValidArtist } from ".";

export type CosmoGravityType = "event-gravity" | "grand-gravity";
export type CosmoPollType = "single-poll" | "combination-poll";

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

export type CosmoBodyItem =
  | CosmoBodySpacing
  | CosmoBodyHeading
  | CosmoBodyImage
  | CosmoBodyText;

export type CosmoSinglePollVoteResult = {
  rank: number;
  votedChoice: {
    choiceName: string;
    choiceImageUrl: string;
    comoUsed: number;
  };
};

export type CosmoSinglePoll = {
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
  finalized: boolean;
  result: {
    totalComoUsed: number;
    voteResults: CosmoSinglePollVoteResult[];
  };
};

export type CosmoCombinationPollVoteSlot = {
  slotName: string;
  slotChoiceName: string;
  slotChoiceCardImageUrl: string;
  comoUsed: number;
};

export type CosmoCombinationPollVoteResult = {
  rank: number;
  votedSlots: CosmoCombinationPollVoteSlot[];
};

export type CosmoCombinationPoll = {
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
  finalized: boolean;
  result: {
    totalComoUsed: number;
    voteResults: CosmoCombinationPollVoteResult[];
  };
};

export type CosmoPoll = CosmoSinglePoll | CosmoCombinationPoll;

export type CosmoLeaderboardItem = {
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
  polls: CosmoPoll[];
  result: {
    totalComoUsed: number;
    resultImageUrl: string;
    resultTitle: string;
  };
  leaderboard: {
    userRanking: CosmoLeaderboardItem[];
  };
};

// TODO: document these
export type CosmoUpcomingGravity = {
  id: number;
  title: string;
  type: CosmoGravityType;
  bannerImageUrl: string;
  entireStartDate: string;
  entireEndDate: string;
};
export type CosmoOngoingGravity = {
  id: number;
  title: string;
  type: CosmoGravityType;
  bannerImageUrl: string;
  entireStartDate: string;
  entireEndDate: string;
};

export type CosmoGravity =
  | CosmoPastGravity
  | CosmoUpcomingGravity
  | CosmoOngoingGravity;

export type CosmoMyGravityVote = {
  choiceId: string;
  voteTo: string;
  voteImageUrl: string;
  comoUsed: number;
  at: string;
};

export type CosmoMyGravityVoteStatus = {
  pollId: number;
  comoUsed: number;
  votes: CosmoMyGravityVote[];
};

export type CosmoMyGravityResult = {
  rank: number;
  totalComoUsed: number;
  voteStatuses: CosmoMyGravityVoteStatus[];
};
