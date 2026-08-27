import type {
  CosmoArtistBFFSchema,
  CosmoArtistWithMembersBFFSchema,
  CosmoMemberBFFSchema,
} from "../schema/artists.ts";

export type CosmoArtistBFF = typeof CosmoArtistBFFSchema.Type;

export type CosmoArtistWithMembersBFF =
  typeof CosmoArtistWithMembersBFFSchema.Type;

export type CosmoMemberBFF = typeof CosmoMemberBFFSchema.Type;
