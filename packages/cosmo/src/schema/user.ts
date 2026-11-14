import { Schema } from "effect";

export const CosmoByNicknameSchema = Schema.Struct({
  nickname: Schema.String,
  address: Schema.String,
  profileImageUrl: Schema.String,
  guid: Schema.String,
});

// plain strings, because a user can hold a profile for an artist the app doesn't know yet
export const CosmoProfileSchema = Schema.Struct({
  artistId: Schema.String,
  artistName: Schema.String,
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
