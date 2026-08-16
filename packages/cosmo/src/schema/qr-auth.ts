import { Schema } from "effect";

export const AuthTicketSchema = Schema.Struct({
  expireAt: Schema.String,
  ticket: Schema.String,
});

export const ProfileImageSchema = Schema.Struct({
  artistName: Schema.String,
  profileImageUrl: Schema.String,
});

export const TicketUserSchema = Schema.Struct({
  id: Schema.Number,
  nickname: Schema.String,
  profileImageUrl: Schema.String,
  profileImages: Schema.mutable(Schema.Array(ProfileImageSchema)),
});

const loadedTicketFields = <T extends string>(status: T) => ({
  status: Schema.Literal(status),
  ticketRemainingMs: Schema.Number,
  ticketOtpRemainingMs: Schema.Number,
  profiles: Schema.mutable(Schema.Array(ProfileImageSchema)),
  user: TicketUserSchema,
});

export const QueryTicketSchema = Schema.Union([
  Schema.Struct({
    status: Schema.Literal("invalid"),
  }),
  Schema.Struct({
    status: Schema.Literal("wait_for_user_action"),
    ticketRemainingMs: Schema.Number,
  }),
  Schema.Struct(loadedTicketFields("wait_for_certify")),
  Schema.Struct(loadedTicketFields("certified")),
]);
