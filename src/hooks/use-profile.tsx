"use client";

import { PublicProfile } from "@/lib/universal/cosmo/auth";
import { ObjektList, ValidObjekt } from "@/lib/universal/objekts";
import { ReactNode, useCallback, useState } from "react";
import {
  createContext,
  useContextSelector,
  ContextSelector,
} from "@fluentui/react-context-selector";
import { Pin } from "@/lib/server/db/schema";
import { OwnedObjekt } from "@/lib/universal/cosmo/objekts";

type ContextProps = {
  profile: PublicProfile | undefined;
  objektLists: ObjektList[];
  lockedObjekts: number[];
  toggleLock: (tokenId: number) => void;
  pins: OwnedObjekt[];
  addPin: (objekt: OwnedObjekt) => void;
  removePin: (tokenId: number) => void;
};

const ProfileContext = createContext<ContextProps>({
  profile: undefined,
  objektLists: [],
  lockedObjekts: [],
  toggleLock: () => {},
  pins: [],
  addPin: () => {},
  removePin: () => {},
});

type ProviderProps = {
  children: ReactNode;
  profile: PublicProfile | undefined;
  objektLists?: ObjektList[];
  lockedObjekts?: number[];
  pins: OwnedObjekt[];
};

export function ProfileProvider({
  children,
  profile,
  objektLists = [],
  lockedObjekts = [],
  pins = [],
}: ProviderProps) {
  const [lockedTokens, setLockedTokens] = useState<number[]>(lockedObjekts);
  const toggleLock = useCallback((tokenId: number) => {
    setLockedTokens((prev) => {
      return prev.includes(tokenId)
        ? prev.filter((id) => id !== tokenId)
        : [...prev, tokenId];
    });
  }, []);

  const [fullPins, setPins] = useState<OwnedObjekt[]>(pins);
  function addPin(objekt: OwnedObjekt) {
    setPins((prev) => [objekt, ...prev]);
  }
  function removePin(tokenId: number | string) {
    setPins((prev) => prev.filter((p) => p.tokenId !== tokenId.toString()));
  }

  return (
    <ProfileContext.Provider
      value={{
        profile,
        objektLists,
        lockedObjekts: lockedTokens,
        toggleLock,
        pins: fullPins,
        addPin,
        removePin,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfileContext = <T,>(
  selector: ContextSelector<ContextProps, T>
) => useContextSelector(ProfileContext, selector);
