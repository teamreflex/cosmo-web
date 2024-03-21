import { ValidArtist } from "./common";

export type CosmoArtist = {
  name: string;
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
