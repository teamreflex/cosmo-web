"use client";

import { TokenPayload } from "@/lib/universal/auth";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { ReactNode, createContext, useContext } from "react";

type ContextProps = {
  artist: ValidArtist;
  token: TokenPayload | undefined;
};

const UserStateContext = createContext<ContextProps>({
  artist: "artms",
  token: undefined,
});

type ProviderProps = {
  children: ReactNode;
  artist: ValidArtist;
  token: TokenPayload | undefined;
};

export function UserStateProvider({ children, artist, token }: ProviderProps) {
  return (
    <UserStateContext.Provider value={{ artist, token }}>
      {children}
    </UserStateContext.Provider>
  );
}

export function useUserState() {
  const ctx = useContext(UserStateContext);
  if (ctx === undefined) {
    throw new Error("useUserState must be used within a UserStateProvider");
  }

  return ctx;
}
