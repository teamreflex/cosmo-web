import type { RefreshTokenResultSchema } from "../schema/auth";

export type LoginChannel = "email";

export type RefreshTokenResult = typeof RefreshTokenResultSchema.Type;
