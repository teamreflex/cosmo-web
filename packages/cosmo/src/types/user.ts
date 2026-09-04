import type {
  CosmoPublicUserSchema,
  CosmoSearchResultSchema,
} from "../schema/user";

export type CosmoPublicUser = typeof CosmoPublicUserSchema.Type;

export type CosmoSearchResult = typeof CosmoSearchResultSchema.Type;
