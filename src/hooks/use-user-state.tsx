import type { PublicUser } from "@/lib/universal/auth";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import { createContext, type PropsWithChildren, use } from "react";

type UserState = {
  user?: PublicUser;
  cosmo?: PublicCosmo;
};

const UserStateContext = createContext<UserState | undefined>(undefined);
type UserStateProviderProps = PropsWithChildren<UserState>;

export function UserStateProvider({
  children,
  ...props
}: UserStateProviderProps) {
  return (
    <UserStateContext.Provider value={props}>
      {children}
    </UserStateContext.Provider>
  );
}

export function useUserState() {
  const ctx = use(UserStateContext);
  if (!ctx)
    throw new Error("useUserState must be used within a UserStateProvider");
  return ctx;
}
