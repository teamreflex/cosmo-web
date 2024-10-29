import { ValidArtist } from "@/lib/universal/cosmo/common";
import { z } from "zod";

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

export interface CosmoSinglePollFinalized
  extends CosmoPollCommon<"single-poll"> {
  finalized: true;
  result: {
    totalComoUsed: number;
    voteResults: CosmoSinglePollVoteResult[];
  };
}

interface CosmoSinglePollUpcoming extends CosmoPollCommon<"single-poll"> {
  finalized: false;
}

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

export interface CosmoCombinationPollFinalized
  extends CosmoPollCommon<"combination-poll"> {
  finalized: true;
  result: {
    totalComoUsed: number;
    voteResults: CosmoCombinationPollVoteResult[];
  };
}

interface CosmoCombinationPollUpcoming
  extends CosmoPollCommon<"combination-poll"> {
  finalized: false;
}

export type CosmoPollFinalized =
  | CosmoSinglePollFinalized
  | CosmoCombinationPollFinalized;
export type CosmoPollUpcoming =
  | CosmoSinglePollUpcoming
  | CosmoCombinationPollUpcoming;

type CosmoLeaderboardItem = {
  rank: number;
  totalComoUsed: number;
  user: {
    nickname: string;
    address: string;
    profileImageUrl: string;
  };
};

export type CosmoGravityCommonFields = {
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
  contractOutlink: string;
};

// TODO: check if past, upcoming and ongoing are the same
export interface CosmoPastGravity extends CosmoGravityCommonFields {
  polls: CosmoPollFinalized[];
  result: {
    totalComoUsed: number;
    resultImageUrl: string;
    resultTitle: string;
  };
  leaderboard: {
    userRanking: CosmoLeaderboardItem[];
  };
}

export interface CosmoUpcomingGravity extends CosmoGravityCommonFields {
  polls: CosmoPollUpcoming[];
}

export interface CosmoOngoingGravity extends CosmoGravityCommonFields {
  polls: CosmoPollUpcoming[];
}

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

export type PollSelectedContentImageContent = {
  type: "image";
  imageUrl: string;
  title: string;
  description: string;
};

export type PollSelectedContentImage = {
  choiceId: string;
  content: PollSelectedContentImageContent;
};

export type PollViewSelectedContent = PollSelectedContentImage;

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
  finalized: boolean;
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

export const fabricateVotePayloadSchema = z.object({
  pollId: z.number(),
  choiceId: z.string(),
  comoAmount: z.number(),
});

export type FabricateVotePayload = z.infer<typeof fabricateVotePayloadSchema>;

export type CosmoGravityVoteCalldata = {
  callData: {
    artist: ValidArtist;
    pollId: number;
    pollIdOnChain: number;
    candidateId: number;
    hash: string;
    salt: string;
    signature: string;
  };
};
