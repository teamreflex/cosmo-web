import type { PublicUser } from "@/lib/universal/auth";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import { createContext, use } from "react";

export type UserState = {
  user?: PublicUser;
  cosmo?: PublicCosmo;
};

export const UserStateContext = createContext<UserState | undefined>(undefined);

export function useUserState() {
  const ctx = use(UserStateContext);
  if (!ctx)
    throw new Error("useUserState must be used within a UserStateProvider");
  return ctx;
}
