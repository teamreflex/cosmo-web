export type AdminApiKey = {
  id: string;
  name: string | null;
  start: string | null;
  prefix: string | null;
  enabled: boolean;
  requestCount: number;
  lastRequest: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  owner: {
    id: string;
    username: string | null;
  };
};

export type UserSearchResult = {
  id: string;
  username: string | null;
  image: string | null;
};
