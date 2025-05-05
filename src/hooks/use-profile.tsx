"use client";

import { createStore, useStore } from "zustand";
import { createContext, PropsWithChildren, useContext, useRef } from "react";
import { CosmoObjekt } from "@/lib/universal/cosmo/objekts";
import { useShallow } from "zustand/react/shallow";
import type { ObjektList } from "@/lib/server/db/schema";
import { PublicUser } from "@/lib/universal/auth";
import { GRID_COLUMNS } from "@/lib/utils";

interface ProfileProps {
  currentUser: PublicUser | undefined;
  targetUser: PublicUser | undefined;
  objektLists: ObjektList[];
  lockedObjekts: number[];
  pins: CosmoObjekt[];
}

type ProfileProviderProps = PropsWithChildren<Partial<ProfileProps>>;

interface ProfileState extends ProfileProps {
  gridColumns: number;
  toggleLock: (tokenId: number) => void;
  addPin: (objekt: CosmoObjekt) => void;
  removePin: (tokenId: number) => void;
}

type ProfileStore = ReturnType<typeof createProfileStore>;

const createProfileStore = (initProps?: Partial<ProfileProps>) => {
  const DEFAULT_PROPS: ProfileProps = {
    currentUser: undefined,
    targetUser: undefined,
    objektLists: [],
    lockedObjekts: [],
    pins: [],
  };

  return createStore<ProfileState>()((set, get) => ({
    ...DEFAULT_PROPS,
    ...initProps,

    /**
     * Get the number of grid columns to use.
     */
    gridColumns:
      get()?.targetUser?.gridColumns ??
      get()?.currentUser?.gridColumns ??
      GRID_COLUMNS,

    /**
     * Toggle the lock state of a token
     */
    toggleLock: (tokenId: number) =>
      set((state) => ({
        ...state,
        lockedObjekts: state.lockedObjekts.includes(tokenId)
          ? state.lockedObjekts.filter((id) => id !== tokenId)
          : [...state.lockedObjekts, tokenId],
      })),

    /**
     * Pin the given objekt
     */
    addPin: (objekt: CosmoObjekt) =>
      set((state) => ({
        ...state,
        pins: [objekt, ...state.pins],
      })),

    /**
     * Remove a pinned objekt
     */
    removePin: (tokenId: number) =>
      set((state) => ({
        ...state,
        pins: state.pins.filter((p) => p.tokenId !== tokenId.toString()),
      })),
  }));
};

const ProfileContext = createContext<ProfileStore | null>(null);

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

export function useProfileContext<T>(selector: (state: ProfileState) => T): T {
  const store = useContext(ProfileContext);
  if (!store) {
    throw new Error("useProfileContext must be used within a ProfileProvider");
  }

  return useStore(store, selector);
}

/**
 * Optimized hook for checking if a token is locked.
 */
export function useLockedObjekt(tokenId: number) {
  const store = useContext(ProfileContext);
  if (!store) {
    throw new Error("useLockedObjekt must be used within a ProfileProvider");
  }

  return useStore(
    store,
    useShallow((state) => state.lockedObjekts.includes(tokenId))
  );
}
