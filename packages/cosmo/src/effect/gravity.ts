import { HttpClientResponse } from "@effect/platform";
import { Effect, Schema } from "effect";
import type { ValidArtist } from "../types/common";
import type { CosmoPollType } from "../types/gravity";
import { bearer, cosmoClient, ValidArtistSchema } from "./http";

const AlignSchema = Schema.Literal("left", "center", "right");

const BodyItemSchema = Schema.Union(
  Schema.Struct({
    type: Schema.Literal("spacing"),
    height: Schema.Number,
  }),
  Schema.Struct({
    type: Schema.Literal("heading"),
    text: Schema.String,
    align: AlignSchema,
    id: Schema.String,
  }),
  Schema.Struct({
    type: Schema.Literal("image"),
    id: Schema.String,
    imageUrl: Schema.String,
    height: Schema.Number,
  }),
  Schema.Struct({
    type: Schema.Literal("text"),
    text: Schema.String,
    align: AlignSchema,
    id: Schema.String,
  }),
  Schema.Struct({
    type: Schema.Literal("video"),
    videoUrl: Schema.String,
    thumbnailImageUrl: Schema.String,
    allowFullScreen: Schema.Boolean,
    useController: Schema.Boolean,
    id: Schema.String,
  }),
);

const pollCommonFields = <T extends CosmoPollType>(type: T) => ({
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

const SinglePollVoteResultSchema = Schema.Struct({
  rank: Schema.Number,
  votedChoice: Schema.Struct({
    choiceName: Schema.String,
    choiceImageUrl: Schema.String,
    comoUsed: Schema.Number,
  }),
});

const CombinationPollVoteResultSchema = Schema.Struct({
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

const PollFinalizedSchema = Schema.Union(
  Schema.Struct({
    ...pollCommonFields("single-poll"),
    finalized: Schema.Literal(true),
    result: Schema.Struct({
      totalComoUsed: Schema.Number,
      voteResults: Schema.mutable(Schema.Array(SinglePollVoteResultSchema)),
    }),
  }),
  Schema.Struct({
    ...pollCommonFields("combination-poll"),
    finalized: Schema.Literal(true),
    result: Schema.Struct({
      totalComoUsed: Schema.Number,
      voteResults: Schema.mutable(
        Schema.Array(CombinationPollVoteResultSchema),
      ),
    }),
  }),
);

const PollUpcomingSchema = Schema.Union(
  Schema.Struct({
    ...pollCommonFields("single-poll"),
    finalized: Schema.Literal(false),
  }),
  Schema.Struct({
    ...pollCommonFields("combination-poll"),
    finalized: Schema.Literal(false),
  }),
);

const gravityCommonFields = {
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
};

const PastGravitySchema = Schema.Struct({
  ...gravityCommonFields,
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

const UpcomingGravitySchema = Schema.Struct({
  ...gravityCommonFields,
  polls: Schema.mutable(Schema.Array(PollUpcomingSchema)),
});

// past first: a past gravity also matches the upcoming shape, which would
// silently drop its result/leaderboard fields
const GravitySchema = Schema.Union(PastGravitySchema, UpcomingGravitySchema);

const GravityListSchema = Schema.Struct({
  upcoming: Schema.mutable(Schema.Array(UpcomingGravitySchema)),
  ongoing: Schema.mutable(Schema.Array(UpcomingGravitySchema)),
  past: Schema.mutable(Schema.Array(PastGravitySchema)),
});

const PollViewSelectedContentSchema = Schema.Struct({
  choiceId: Schema.String,
  content: Schema.Struct({
    id: Schema.String,
    type: Schema.Literal("image"),
    imageUrl: Schema.String,
    title: Schema.String,
    description: Schema.String,
  }),
});

const pollChoicesCommonFields = <T extends CosmoPollType>(type: T) => ({
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
    defaultContent: Schema.Struct({
      type: Schema.Literal("image"),
      imageUrl: Schema.String,
      title: Schema.String,
      description: Schema.String,
    }),
    selectedContent: Schema.mutable(
      Schema.Array(PollViewSelectedContentSchema),
    ),
    choiceViewType: Schema.Literal("vertical", "horizontal"),
    selectContent: Schema.mutable(Schema.Array(PollViewSelectedContentSchema)),
  }),
});

const PollChoicesSchema = Schema.Union(
  Schema.Struct({
    ...pollChoicesCommonFields("single-poll"),
    choices: Schema.mutable(
      Schema.Array(
        Schema.Struct({
          id: Schema.String,
          title: Schema.String,
          description: Schema.String,
          txImageUrl: Schema.String,
        }),
      ),
    ),
  }),
  Schema.Struct({
    ...pollChoicesCommonFields("combination-poll"),
    choices: Schema.mutable(
      Schema.Array(
        Schema.Struct({
          id: Schema.String,
          txImageUrl: Schema.String,
          txImagePairUrls: Schema.mutable(Schema.Array(Schema.String)),
        }),
      ),
    ),
  }),
);

/**
 * Fetch the list of gravities for the given artist.
 */
export const fetchGravities = Effect.fn("Cosmo.fetchGravities")(function* (
  token: string,
  artistId: ValidArtist,
) {
  const client = yield* cosmoClient;
  return yield* client
    .get("/bff/v3/gravities", {
      headers: bearer(token),
      urlParams: { artistId },
    })
    .pipe(
      Effect.flatMap(HttpClientResponse.schemaBodyJson(GravityListSchema)),
      Effect.scoped,
    );
});

/**
 * Fetch a single gravity.
 */
export const fetchGravity = Effect.fn("Cosmo.fetchGravity")(function* (
  token: string,
  gravityId: number,
) {
  const client = yield* cosmoClient;
  const response = yield* client
    .get(`/bff/v3/gravities/${gravityId}`, { headers: bearer(token) })
    .pipe(
      Effect.flatMap(
        HttpClientResponse.schemaBodyJson(
          Schema.Struct({ gravity: GravitySchema }),
        ),
      ),
      Effect.scoped,
    );
  return response.gravity;
});

/**
 * Fetch the poll fields.
 */
export const fetchPoll = Effect.fn("Cosmo.fetchPoll")(function* (
  token: string,
  pollId: number,
) {
  const client = yield* cosmoClient;
  const response = yield* client
    .get(`/bff/v3/polls/${pollId}`, { headers: bearer(token) })
    .pipe(
      Effect.flatMap(
        HttpClientResponse.schemaBodyJson(
          Schema.Struct({ pollDetail: PollChoicesSchema }),
        ),
      ),
      Effect.scoped,
    );
  return response.pollDetail;
});
