import type {
  CosmoPublicUserSchema,
  CosmoSearchResultSchema,
} from "../schema/user.ts";

export type CosmoPublicUser = typeof CosmoPublicUserSchema.Type;

export type CosmoSearchResult = typeof CosmoSearchResultSchema.Type;
