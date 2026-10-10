import type { StaffUser } from "@/lib/universal/staff-users";

export type AdminApiKey = {
  id: string;
  name: string | null;
  start: string | null;
  enabled: boolean;
  requestCount: number;
  lastRequest: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  owner: StaffUser;
};

export type UserSearchResult = {
  id: string;
  cosmoUsername: string;
};
