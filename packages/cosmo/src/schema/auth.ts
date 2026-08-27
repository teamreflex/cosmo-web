import { Schema } from "effect";

export const RefreshTokenResultSchema = Schema.Struct({
  refreshToken: Schema.String,
  accessToken: Schema.String,
});

export const RefreshResponseSchema = Schema.Struct({
  credentials: RefreshTokenResultSchema,
});
