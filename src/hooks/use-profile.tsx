import { createStore, useStore } from "zustand";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useRef,
} from "react";
import type { CosmoObjekt } from "@/lib/universal/cosmo/objekts";
import { useShallow } from "zustand/react/shallow";
import type { ObjektList } from "@/lib/server/db/schema";
import type { PublicAccount } from "@/lib/universal/cosmo-accounts";

interface ProfileProps {
  target: Partial<PublicAccount> | undefined;
  objektLists: ObjektList[];
  lockedObjekts: number[];
  pins: CosmoObjekt[];
}

type ProfileProviderProps = PropsWithChildren<Partial<ProfileProps>>;

interface ProfileState extends ProfileProps {
  toggleLock: (tokenId: number) => void;
  addPin: (objekt: CosmoObjekt) => void;
  removePin: (tokenId: number) => void;
}

type ProfileStore = ReturnType<typeof createProfileStore>;

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
  return useProfileContext(
    useShallow((state) => state.lockedObjekts.includes(tokenId))
  );
}

/**
 * Optimized hook for checking if a token is locked.
 */
export function usePinnedObjekt(tokenId: number) {
  return useProfileContext(
    useShallow(
      (state) =>
        state.pins.findIndex((p) => Number(p.tokenId) === tokenId) !== -1
    )
  );
}
