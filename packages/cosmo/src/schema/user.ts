import { Schema } from "effect";
import { ValidArtistSchema } from "./common";

export const CosmoByNicknameSchema = Schema.Struct({
  nickname: Schema.String,
  address: Schema.String,
  profileImageUrl: Schema.String,
  guid: Schema.String,
});

export const CosmoProfileSchema = Schema.Struct({
  artistId: ValidArtistSchema,
  artistName: ValidArtistSchema,
  image: Schema.Struct({
    original: Schema.String,
    thumbnail: Schema.String,
  }),
});

export const CosmoPublicUserSchema = Schema.Struct({
  id: Schema.Number,
  nickname: Schema.String,
  profileImageUrl: Schema.String,
  address: Schema.String,
  userProfiles: Schema.mutable(Schema.Array(CosmoProfileSchema)),
});

export const CosmoSearchResultSchema = Schema.Struct({
  hasNext: Schema.Boolean,
  nextStartAfter: Schema.NullOr(Schema.String),
  results: Schema.mutable(Schema.Array(CosmoPublicUserSchema)),
});

export const CosmoUserProfileSchema = Schema.Struct({
  id: Schema.Number,
  nickname: Schema.String,
  address: Schema.String,
  profileImageUrl: Schema.String,
  fandomName: Schema.String,
  followDurationDays: Schema.Number,
  currentStreak: Schema.Number,
  statusMessage: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
});
