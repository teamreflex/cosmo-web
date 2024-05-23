"use client";

import { PublicProfile } from "@/lib/universal/cosmo/auth";
import { ObjektList } from "@/lib/universal/objekts";
import { ReactNode, createContext, useContext } from "react";

type ContextProps = {
  profile: PublicProfile | undefined;
  objektLists: ObjektList[];
};

const ProfileContext = createContext<ContextProps>({
  profile: undefined,
  objektLists: [],
});

type ProviderProps = {
  children: ReactNode;
  profile: PublicProfile | undefined;
  objektLists?: ObjektList[];
};

export function ProfileProvider({
  children,
  profile,
  objektLists = [],
}: ProviderProps) {
  return (
    <ProfileContext.Provider value={{ profile, objektLists }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (ctx === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }

  return ctx;
}
