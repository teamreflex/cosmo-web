import {
  ProfileContext,
  type ProfileState,
  type ProfileStore,
} from "@/hooks/use-profile";
import type { PublicAccount } from "@/lib/universal/cosmo-accounts";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import type { ObjektList } from "@apollo/database/web/types";
import { useRef } from "react";
import type { PropsWithChildren } from "react";
import { createStore } from "zustand";

interface ProfileProps {
  target: Partial<PublicAccount> | undefined;
  objektLists: ObjektList[];
  lockedObjekts: number[];
  pins: CosmoObjekt[];
}

type ProfileProviderProps = PropsWithChildren<Partial<ProfileProps>>;

const createProfileStore = (initProps?: Partial<ProfileProps>) => {
  const DEFAULT_PROPS: ProfileProps = {
    target: undefined,
    objektLists: [],
    lockedObjekts: [],
    pins: [],
  };

  return createStore<ProfileState>()((set) => ({
    ...DEFAULT_PROPS,
    ...initProps,

    toggleLock: (tokenId: number) =>
      set((state) => ({
        ...state,
        lockedObjekts: state.lockedObjekts.includes(tokenId)
          ? state.lockedObjekts.filter((id) => id !== tokenId)
          : [...state.lockedObjekts, tokenId],
      })),

    addPin: (objekt: CosmoObjekt) =>
      set((state) => ({
        ...state,
        pins: [objekt, ...state.pins],
      })),

    removePin: (tokenId: number) =>
      set((state) => ({
        ...state,
        pins: state.pins.filter((p) => p.tokenId !== tokenId.toString()),
      })),

    addObjektList: (list: ObjektList) =>
      set((state) => ({
        ...state,
        objektLists: [...state.objektLists, list],
      })),

    removeObjektList: (listId: string) =>
      set((state) => ({
        ...state,
        objektLists: state.objektLists.filter((l) => l.id !== listId),
      })),
  }));
};

export function ProfileProvider({ children, ...props }: ProfileProviderProps) {
  const storeRef = useRef<ProfileStore>(null);
  if (!storeRef.current) {
    storeRef.current = createProfileStore(props);
  }
  return (
    <ProfileContext.Provider value={storeRef.current}>
      {children}
    </ProfileContext.Provider>
  );
}
