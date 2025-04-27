"use client";

import { createStore, useStore } from "zustand";
import { createContext, PropsWithChildren, useContext, useRef } from "react";
import { PublicUser } from "@/lib/universal/auth";

interface UserStateProps {
  currentUser?: PublicUser;
  selectedArtists: string[];
}

type UserStateProviderProps = PropsWithChildren<{
  currentUser?: PublicUser;
  selectedArtists?: string[];
}>;

interface UserState extends UserStateProps {
  selectArtist: (artistId: string) => void;
}

type UserStateStore = ReturnType<typeof createUserStateStore>;

const createUserStateStore = (initProps?: Partial<UserStateProps>) => {
  const DEFAULT_PROPS: UserStateProps = {
    currentUser: undefined,
    selectedArtists: [],
  };

  return createStore<UserState>()((set) => ({
    ...DEFAULT_PROPS,
    ...initProps,

    /**
     * Toggle selection of an artist.
     */
    selectArtist: (artistId: string) =>
      set((state) => ({
        ...state,
        selectedArtists: state.selectedArtists.includes(artistId)
          ? state.selectedArtists.filter((id) => id !== artistId)
          : [...state.selectedArtists, artistId],
      })),
  }));
};

const UserStateContext = createContext<UserStateStore | null>(null);

export function UserStateProvider({
  children,
  ...props
}: UserStateProviderProps) {
  const storeRef = useRef<UserStateStore>(null);
  if (!storeRef.current) {
    storeRef.current = createUserStateStore(props);
  }
  return (
    <UserStateContext.Provider value={storeRef.current}>
      {children}
    </UserStateContext.Provider>
  );
}

export function useUserState<T>(selector: (state: UserState) => T): T {
  const store = useContext(UserStateContext);
  if (!store) {
    throw new Error("useUserState must be used within a UserStateProvider");
  }

  return useStore(store, selector);
}
