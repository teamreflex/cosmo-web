import { ValidArtist } from "./common";

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
  title: string;
  fandomName: string;
  logoImageUrl: string;
  primaryImageUrl: string;
  contracts: {
    Como: string;
    Objekt: string;
    ObjektMinter: string;
    Governor: string;
    CommunityPool: string;
    ComoMinter: string;
  };
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  activeAt: string;
  order: number;
};
