export type CosmoRewardAvailable = {
  isClaimable: boolean;
};

export type CosmoRewardList = {
  count: number;
  items: CosmoRewardItem[];
  claimCount: number;
};

export type CosmoRewardItem = {
  id: number;
  isClaimed: boolean;
  thumbnailImage: string;
  title: string;
  category: string;
  endedAt: string;
};
