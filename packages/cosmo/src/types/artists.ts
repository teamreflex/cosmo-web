import type {
  CosmoArtistBFFSchema,
  CosmoArtistBFFSNSLinkSchema,
  CosmoArtistSchema,
  CosmoArtistWithMembersBFFSchema,
  CosmoMemberBFFSchema,
} from "../schema/artists";
import type { ValidArtist } from "./common";

export type CosmoArtist = typeof CosmoArtistSchema.Type;

type CosmoMember = {
  id: number;
  name: string;
  artist: ValidArtist;
  units: string[];
  alias: string;
  profileImageUrl: string;
  mainObjektImageUrl: string;
  order: number;
};

export interface CosmoArtistWithMembers extends CosmoArtist {
  members: CosmoMember[];
}

export type CosmoArtistBFF = typeof CosmoArtistBFFSchema.Type;

export type CosmoArtistWithMembersBFF =
  typeof CosmoArtistWithMembersBFFSchema.Type;

export type CosmoMemberBFF = typeof CosmoMemberBFFSchema.Type;

export type CosmoArtistBFFSNSLink = typeof CosmoArtistBFFSNSLinkSchema.Type;
