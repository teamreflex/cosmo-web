import { HttpClientResponse } from "@effect/platform";
import { Effect, Schema } from "effect";
import type { ValidArtist } from "../types/common";
import { bearer, cosmoClient, ValidArtistSchema } from "./http";

const ContractsSchema = Schema.Struct({
  Como: Schema.String,
  Objekt: Schema.String,
  ObjektMinter: Schema.String,
  Governor: Schema.String,
  CommunityPool: Schema.String,
  ComoMinter: Schema.String,
});

const CosmoArtistSchema = Schema.Struct({
  name: ValidArtistSchema,
  title: Schema.String,
  fandomName: Schema.String,
  logoImageUrl: Schema.String,
  contracts: ContractsSchema,
});

const CosmoMemberBFFSchema = Schema.Struct({
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

const SNSLinkSchema = Schema.Struct({
  name: Schema.String,
  address: Schema.String,
});

const CosmoArtistWithMembersBFFSchema = Schema.Struct({
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
  artistMembers: Schema.mutable(Schema.Array(CosmoMemberBFFSchema)),
  snsLink: Schema.Struct({
    discord: SNSLinkSchema,
    instagram: SNSLinkSchema,
    twitter: SNSLinkSchema,
    youtube: SNSLinkSchema,
    tiktok: SNSLinkSchema,
  }),
});

/**
 * Fetch artists within COSMO.
 */
export const fetchArtists = Effect.fn("Cosmo.fetchArtists")(function* (
  token: string,
) {
  const client = yield* cosmoClient;
  return yield* client
    .get("/bff/v3/artists", { headers: bearer(token) })
    .pipe(
      Effect.flatMap(
        HttpClientResponse.schemaBodyJson(
          Schema.mutable(Schema.Array(CosmoArtistSchema)),
        ),
      ),
      Effect.scoped,
    );
});

/**
 * Fetch a single artist and its members.
 */
export const fetchArtist = Effect.fn("Cosmo.fetchArtist")(function* (
  token: string,
  artistId: ValidArtist,
) {
  const client = yield* cosmoClient;
  return yield* client
    .get(`/bff/v3/artists/${artistId}`, { headers: bearer(token) })
    .pipe(
      Effect.flatMap(
        HttpClientResponse.schemaBodyJson(CosmoArtistWithMembersBFFSchema),
      ),
      Effect.scoped,
    );
});
