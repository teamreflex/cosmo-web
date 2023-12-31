import { ValidArtist } from "./common";

export type CosmoArtist = {
  name: string;
  title: string;
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

export type CosmoMember = {
  name: string;
  artist: ValidArtist;
  units: string[];
  alias: string;
  profileImageUrl: string;
  mainObjektImageUrl: string;
  order: number;
};

export type CosmoArtistWithMembers = CosmoArtist & {
  members: CosmoMember[];
};
