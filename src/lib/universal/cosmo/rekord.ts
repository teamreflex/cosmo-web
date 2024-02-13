export type CosmoRekordArtistMember = {
  id: number;
  name: string;
  profileImage: string;
};

export type CosmoRekordArtist = {
  name: string;
  title: string;
  profileImage: string;
};

export type CosmoRekordPost = {
  id: number;
  totalLikeCount: number;
  createdAt: string;
  updatedAt: string;
  expiredAt: string;
  isExpired: boolean;
  isBlinded: boolean;
  isDeleted: boolean;
  isArchived: boolean;
  isLikedPost: boolean;
  isReportedPost: boolean;
  owner: {
    id: number;
    nickname: string;
  };
  artistMembers: CosmoRekordArtistMember[];
  artist: CosmoRekordArtist;
  image: {
    thumbnail: string;
    large: string;
  };
};

export type CosmoRekordTopPost = {
  post: CosmoRekordPost;
  rank: number;
};

export type CosmoRekordArchiveStatus = {
  postCount: number;
  likeCount: number;
  followerCount: number;
  fandomName: string;
};
