import { Schema } from "effect";
import { ValidArtistSchema } from "./common";

const AlignSchema = Schema.Literal("left", "center", "right");

export const CosmoBodySpacingSchema = Schema.Struct({
  type: Schema.Literal("spacing"),
  height: Schema.Number,
});

export const CosmoBodyHeadingSchema = Schema.Struct({
  type: Schema.Literal("heading"),
  text: Schema.String,
  align: AlignSchema,
  id: Schema.String,
});

export const CosmoBodyImageSchema = Schema.Struct({
  type: Schema.Literal("image"),
  id: Schema.String,
  imageUrl: Schema.String,
  height: Schema.Number,
});

export const CosmoBodyTextSchema = Schema.Struct({
  type: Schema.Literal("text"),
  text: Schema.String,
  align: AlignSchema,
  id: Schema.String,
});

export const CosmoBodyVideoSchema = Schema.Struct({
  type: Schema.Literal("video"),
  videoUrl: Schema.String,
  thumbnailImageUrl: Schema.String,
  allowFullScreen: Schema.Boolean,
  useController: Schema.Boolean,
  id: Schema.String,
});

const BodyItemSchema = Schema.Union(
  CosmoBodySpacingSchema,
  CosmoBodyHeadingSchema,
  CosmoBodyImageSchema,
  CosmoBodyTextSchema,
  CosmoBodyVideoSchema,
);

const pollCommonFields = <T extends "single-poll" | "combination-poll">(
  type: T,
) => ({
  id: Schema.Number,
  artist: ValidArtistSchema,
  artistId: ValidArtistSchema,
  pollIdOnChain: Schema.Number,
  gravityId: Schema.Number,
  type: Schema.Literal(type),
  indexInGravity: Schema.Number,
  title: Schema.String,
  imageUrl: Schema.String,
  startDate: Schema.String,
  endDate: Schema.String,
  revealDate: Schema.String,
  titleKo: Schema.String,
  titleEn: Schema.String,
  titleJa: Schema.String,
  titleZhCn: Schema.String,
  titleZhTw: Schema.String,
});

export const SinglePollVoteResultSchema = Schema.Struct({
  rank: Schema.Number,
  votedChoice: Schema.Struct({
    choiceName: Schema.String,
    choiceImageUrl: Schema.String,
    comoUsed: Schema.Number,
  }),
});

export const CombinationPollVoteResultSchema = Schema.Struct({
  rank: Schema.Number,
  votedSlots: Schema.mutable(
    Schema.Array(
      Schema.Struct({
        slotName: Schema.String,
        slotChoiceName: Schema.String,
        slotChoiceCardImageUrl: Schema.String,
        comoUsed: Schema.Number,
      }),
    ),
  ),
});

export const SinglePollFinalizedSchema = Schema.Struct({
  ...pollCommonFields("single-poll"),
  finalized: Schema.Literal(true),
  result: Schema.Struct({
    totalComoUsed: Schema.Number,
    voteResults: Schema.mutable(Schema.Array(SinglePollVoteResultSchema)),
  }),
});

export const CombinationPollFinalizedSchema = Schema.Struct({
  ...pollCommonFields("combination-poll"),
  finalized: Schema.Literal(true),
  result: Schema.Struct({
    totalComoUsed: Schema.Number,
    voteResults: Schema.mutable(Schema.Array(CombinationPollVoteResultSchema)),
  }),
});

export const PollFinalizedSchema = Schema.Union(
  SinglePollFinalizedSchema,
  CombinationPollFinalizedSchema,
);

export const PollUpcomingSchema = Schema.Union(
  Schema.Struct({
    ...pollCommonFields("single-poll"),
    finalized: Schema.Literal(false),
  }),
  Schema.Struct({
    ...pollCommonFields("combination-poll"),
    finalized: Schema.Literal(false),
  }),
);

export const GravityCommonFieldsSchema = Schema.Struct({
  id: Schema.Number,
  artist: ValidArtistSchema,
  title: Schema.String,
  description: Schema.String,
  type: Schema.Literal("event-gravity", "grand-gravity"),
  pollType: Schema.Literal("single-poll", "combination-poll"),
  bannerImageUrl: Schema.String,
  entireStartDate: Schema.String,
  entireEndDate: Schema.String,
  body: Schema.mutable(Schema.Array(BodyItemSchema)),
  contractOutlink: Schema.String,
});

export const PastGravitySchema = Schema.Struct({
  ...GravityCommonFieldsSchema.fields,
  polls: Schema.mutable(Schema.Array(PollFinalizedSchema)),
  result: Schema.Struct({
    totalComoUsed: Schema.Number,
    resultImageUrl: Schema.String,
    resultTitle: Schema.String,
  }),
  leaderboard: Schema.Struct({
    userRanking: Schema.mutable(
      Schema.Array(
        Schema.Struct({
          rank: Schema.Number,
          totalComoUsed: Schema.Number,
          user: Schema.Struct({
            nickname: Schema.String,
            address: Schema.String,
            profileImageUrl: Schema.String,
          }),
        }),
      ),
    ),
  }),
});

export const UpcomingGravitySchema = Schema.Struct({
  ...GravityCommonFieldsSchema.fields,
  polls: Schema.mutable(Schema.Array(PollUpcomingSchema)),
});

// past first: a past gravity also matches the upcoming shape, which would
// silently drop its result/leaderboard fields
export const GravitySchema = Schema.Union(
  PastGravitySchema,
  UpcomingGravitySchema,
);

export const GravityResponseSchema = Schema.Struct({ gravity: GravitySchema });

export const GravityListSchema = Schema.Struct({
  upcoming: Schema.mutable(Schema.Array(UpcomingGravitySchema)),
  ongoing: Schema.mutable(Schema.Array(UpcomingGravitySchema)),
  past: Schema.mutable(Schema.Array(PastGravitySchema)),
});

export const PollViewDefaultContentSchema = Schema.Struct({
  type: Schema.Literal("image"),
  imageUrl: Schema.String,
  title: Schema.String,
  description: Schema.String,
});

export const PollViewSelectedContentSchema = Schema.Struct({
  choiceId: Schema.String,
  content: Schema.Struct({
    id: Schema.String,
    type: Schema.Literal("image"),
    imageUrl: Schema.String,
    title: Schema.String,
    description: Schema.String,
  }),
});

const pollChoicesCommonFields = <T extends "single-poll" | "combination-poll">(
  type: T,
) => ({
  id: Schema.Number,
  artist: ValidArtistSchema,
  pollIdOnChain: Schema.Number,
  gravityId: Schema.Number,
  type: Schema.Literal(type),
  indexInGravity: Schema.Number,
  title: Schema.String,
  imageUrl: Schema.String,
  startDate: Schema.String,
  endDate: Schema.String,
  revealDate: Schema.String,
  finalized: Schema.Boolean,
  pollViewMetadata: Schema.Struct({
    title: Schema.String,
    background: Schema.Null,
    defaultContent: PollViewDefaultContentSchema,
    selectedContent: Schema.mutable(
      Schema.Array(PollViewSelectedContentSchema),
    ),
    choiceViewType: Schema.Literal("vertical", "horizontal"),
    selectContent: Schema.mutable(Schema.Array(PollViewSelectedContentSchema)),
  }),
});

export const SinglePollChoiceSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  description: Schema.String,
  txImageUrl: Schema.String,
});

export const CombinationPollChoiceSchema = Schema.Struct({
  id: Schema.String,
  txImageUrl: Schema.String,
  txImagePairUrls: Schema.mutable(Schema.Array(Schema.String)),
});

export const PollChoicesSchema = Schema.Union(
  Schema.Struct({
    ...pollChoicesCommonFields("single-poll"),
    choices: Schema.mutable(Schema.Array(SinglePollChoiceSchema)),
  }),
  Schema.Struct({
    ...pollChoicesCommonFields("combination-poll"),
    choices: Schema.mutable(Schema.Array(CombinationPollChoiceSchema)),
  }),
);

export const PollDetailResponseSchema = Schema.Struct({
  pollDetail: PollChoicesSchema,
});
