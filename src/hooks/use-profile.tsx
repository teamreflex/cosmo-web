"use client";

import { PublicProfile } from "@/lib/universal/cosmo/auth";
import { ReactNode, createContext, useContext } from "react";

type ContextProps = {
  profile: PublicProfile | undefined;
};

const ProfileContext = createContext<ContextProps>({
  profile: undefined,
});

type ProviderProps = {
  profile: PublicProfile | undefined;
  children: ReactNode;
};

export function ProfileProvider({ profile, children }: ProviderProps) {
  return (
    <ProfileContext.Provider value={{ profile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (ctx === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }

  return ctx.profile;
}
