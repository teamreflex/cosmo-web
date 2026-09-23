import type { ProfilePin } from "@/lib/universal/binders";
import type { PublicAccount } from "@/lib/universal/cosmo-accounts";
import type { ObjektList } from "@apollo/database/web/types";
import { createContext, useContext } from "react";
import type { StoreApi } from "zustand";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

interface ProfileProps {
  target: Partial<PublicAccount> | undefined;
  objektLists: ObjektList[];
  lockedObjekts: number[];
  pins: ProfilePin[];
}

export interface ProfileState extends ProfileProps {
  toggleLock: (tokenId: number) => void;
  updatePins: (update: (pins: ProfilePin[]) => ProfilePin[]) => void;
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
        state.pins.some(
          (pin) =>
            pin.kind === "objekt" && Number(pin.objekt.tokenId) === tokenId,
        ),
    ),
  );
}
