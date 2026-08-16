import { Schema } from "effect";
import { ValidArtistSchema } from "./common";

const ContractsSchema = Schema.Struct({
  Como: Schema.String,
  Objekt: Schema.String,
  ObjektMinter: Schema.String,
  Governor: Schema.String,
  CommunityPool: Schema.String,
  ComoMinter: Schema.String,
});

export const CosmoArtistSchema = Schema.Struct({
  name: ValidArtistSchema,
  title: Schema.String,
  fandomName: Schema.String,
  logoImageUrl: Schema.String,
  contracts: ContractsSchema,
});

export const CosmoArtistListSchema = Schema.mutable(
  Schema.Array(CosmoArtistSchema),
);

export const CosmoMemberBFFSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  units: Schema.String,
  alias: Schema.String,
  profileImageUrl: Schema.String,
  backgroundImageUrl: Schema.String,
  order: Schema.Number,
  createdAt: Schema.String,
  updatedAt: Schema.String,
  mainObjektImageUrl: Schema.NullOr(Schema.String),
  artistId: Schema.String,
  primaryColorHex: Schema.String,
});

export const CosmoArtistBFFSNSLinkSchema = Schema.Struct({
  name: Schema.String,
  address: Schema.String,
});

export const CosmoArtistBFFSchema = Schema.Struct({
  name: Schema.String,
  id: ValidArtistSchema,
  title: Schema.String,
  fandomName: Schema.String,
  logoImageUrl: Schema.String,
  primaryImageUrl: Schema.String,
  category: Schema.String,
  wasReleased: Schema.Boolean,
  comoTokenId: Schema.Number,
  contracts: ContractsSchema,
});

export const CosmoArtistWithMembersBFFSchema = Schema.Struct({
  ...CosmoArtistBFFSchema.fields,
  artistMembers: Schema.mutable(Schema.Array(CosmoMemberBFFSchema)),
  snsLink: Schema.Struct({
    discord: CosmoArtistBFFSNSLinkSchema,
    instagram: CosmoArtistBFFSNSLinkSchema,
    twitter: CosmoArtistBFFSNSLinkSchema,
    youtube: CosmoArtistBFFSNSLinkSchema,
    tiktok: CosmoArtistBFFSNSLinkSchema,
  }),
});
