export type CosmoActivityMyObjektMember = {
  name: string;
  profileImage: string;
  count: number;
  color: string;
};

export type CosmoActivityMyObjektResult = {
  totalCount: number;
  countByMember: CosmoActivityMyObjektMember[];
};
