import type {
  CombinationPollFinalizedSchema,
  CombinationPollViewMetadataSchema,
  CombinationPollVoteResultSchema,
  CosmoBodyHeadingSchema,
  CosmoBodyImageSchema,
  CosmoBodySpacingSchema,
  CosmoBodyTextSchema,
  CosmoBodyVideoSchema,
  GravityCommonFieldsSchema,
  GravitySchema,
  PastGravitySchema,
  PollChoicesSchema,
  PollFinalizedSchema,
  PollUpcomingSchema,
  PollChoiceSchema,
  PollViewDefaultContentSchema,
  PollViewSelectedContentSchema,
  SinglePollFinalizedSchema,
  SinglePollViewMetadataSchema,
  SinglePollVoteResultSchema,
  UpcomingGravitySchema,
} from "../schema/gravity";
import type { ValidArtist } from "./common";

export type CosmoGravityType = "event-gravity" | "grand-gravity";
export type CosmoPollType = "single-poll" | "combination-poll";

export type CosmoBodySpacing = typeof CosmoBodySpacingSchema.Type;

export type CosmoBodyHeading = typeof CosmoBodyHeadingSchema.Type;

export type CosmoBodyImage = typeof CosmoBodyImageSchema.Type;

export type CosmoBodyText = typeof CosmoBodyTextSchema.Type;

export type CosmoBodyVideo = typeof CosmoBodyVideoSchema.Type;

export type CosmoSinglePollVoteResult = typeof SinglePollVoteResultSchema.Type;

export type CosmoSinglePollFinalized = typeof SinglePollFinalizedSchema.Type;

export type CosmoCombinationPollVoteResult =
  typeof CombinationPollVoteResultSchema.Type;

export type CosmoCombinationPollFinalized =
  typeof CombinationPollFinalizedSchema.Type;

export type CosmoPollFinalized = typeof PollFinalizedSchema.Type;
export type CosmoPollUpcoming = typeof PollUpcomingSchema.Type;

export type CosmoGravityCommonFields = typeof GravityCommonFieldsSchema.Type;

export type CosmoPastGravity = typeof PastGravitySchema.Type;

// upcoming and ongoing gravities share the same shape
export type CosmoUpcomingGravity = typeof UpcomingGravitySchema.Type;

export type CosmoOngoingGravity = typeof UpcomingGravitySchema.Type;

export type CosmoGravity = typeof GravitySchema.Type;

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

export type PollViewDefaultContent = typeof PollViewDefaultContentSchema.Type;

export type PollSelectedContentImage =
  typeof PollViewSelectedContentSchema.Type;

export type PollSelectedContentImageContent =
  PollSelectedContentImage["content"];

export type PollViewSelectedContent = PollSelectedContentImage;

export type PollChoice = typeof PollChoiceSchema.Type;

export type SinglePollViewMetadata = typeof SinglePollViewMetadataSchema.Type;

export type CombinationPollViewMetadata =
  typeof CombinationPollViewMetadataSchema.Type;

export type CosmoPollChoices = typeof PollChoicesSchema.Type;

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
