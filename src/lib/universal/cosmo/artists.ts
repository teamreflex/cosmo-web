import type { ValidArtist } from "./common";

export type CosmoArtist = {
  name: ValidArtist;
  title: string;
  fandomName: string;
  logoImageUrl: string;
  contracts: {
    Como: string;
    Objekt: string;
    ObjektMinter: string;
    Governor: string;
    CommunityPool: string;
    ComoMinter: string;
  };
};

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

export type CosmoArtistBFF = {
  name: string;
  id: ValidArtist;
  title: string;
  fandomName: string;
  logoImageUrl: string;
  primaryImageUrl: string;
  category: string;
  wasReleased: boolean;
  comoTokenId: number;
  contracts: {
    Como: string;
    Objekt: string;
    ObjektMinter: string;
    Governor: string;
    CommunityPool: string;
    ComoMinter: string;
  };
};

export interface CosmoArtistWithMembersBFF extends CosmoArtistBFF {
  artistMembers: CosmoMemberBFF[];
  snsLink: {
    discord: CosmoArtistBFFSNSLink;
    instagram: CosmoArtistBFFSNSLink;
    twitter: CosmoArtistBFFSNSLink;
    youtube: CosmoArtistBFFSNSLink;
    tiktok: CosmoArtistBFFSNSLink;
  };
}

export type CosmoMemberBFF = {
  id: number;
  name: string;
  units: string;
  alias: string;
  profileImageUrl: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  mainObjektImageUrl: string;
  artistId: string;
  primaryColorHex: string;
};

export type CosmoArtistBFFSNSLink = {
  name: string;
  address: string;
};
