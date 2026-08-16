import type {
  CosmoByNicknameSchema,
  CosmoProfileSchema,
  CosmoPublicUserSchema,
  CosmoSearchResultSchema,
  CosmoUserProfileSchema,
} from "../schema/user";

export type CosmoProfile = typeof CosmoProfileSchema.Type;

export type CosmoPublicUser = typeof CosmoPublicUserSchema.Type;

export type CosmoSearchResult = typeof CosmoSearchResultSchema.Type;

export type CosmoUserProfile = typeof CosmoUserProfileSchema.Type;

export type CosmoByNickname = typeof CosmoByNicknameSchema.Type;
