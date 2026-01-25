import type { PublicAccount } from "@/lib/universal/cosmo-accounts";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import type { ObjektList } from "@apollo/database/web/types";
import { createContext, useContext } from "react";
import type { StoreApi } from "zustand";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

interface ProfileProps {
  target: Partial<PublicAccount> | undefined;
  objektLists: ObjektList[];
  lockedObjekts: number[];
  pins: CosmoObjekt[];
}

export interface ProfileState extends ProfileProps {
  toggleLock: (tokenId: number) => void;
  addPin: (objekt: CosmoObjekt) => void;
  removePin: (tokenId: number) => void;
  addObjektList: (list: ObjektList) => void;
  removeObjektList: (listId: string) => void;
}

export type ProfileStore = StoreApi<ProfileState>;

export const ProfileContext = createContext<ProfileStore | null>(null);

export function useProfileContext<T>(selector: (state: ProfileState) => T): T {
  const store = useContext(ProfileContext);
  if (!store) {
    throw new Error("useProfileContext must be used within a ProfileProvider");
  }

  return useStore(store, selector);
}

export function useLockedObjekt(tokenId: number) {
  return useProfileContext(
    useShallow((state) => state.lockedObjekts.includes(tokenId)),
  );
}

export function usePinnedObjekt(tokenId: number) {
  return useProfileContext(
    useShallow(
      (state) =>
        state.pins.findIndex((p) => Number(p.tokenId) === tokenId) !== -1,
    ),
  );
}
