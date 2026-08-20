import type {
  GravitySchema,
  PastGravitySchema,
  PollChoicesSchema,
  PollFinalizedSchema,
  PollUpcomingSchema,
  PollViewSelectedContentSchema,
  UpcomingGravitySchema,
} from "../schema/gravity.ts";

export type CosmoGravityType = "event-gravity" | "grand-gravity";
export type CosmoPollType = "single-poll" | "combination-poll";

export type CosmoPollFinalized = typeof PollFinalizedSchema.Type;
export type CosmoPollUpcoming = typeof PollUpcomingSchema.Type;

export type CosmoPastGravity = typeof PastGravitySchema.Type;

// ongoing gravities share the upcoming shape
export type CosmoOngoingGravity = typeof UpcomingGravitySchema.Type;

export type CosmoGravity = typeof GravitySchema.Type;

export type PollSelectedContentImage =
  typeof PollViewSelectedContentSchema.Type;

export type CosmoPollChoices = typeof PollChoicesSchema.Type;
