import { ProfileContext, type ProfileState } from "@/hooks/use-profile";
import type { ProfilePin } from "@/lib/universal/binders";
import type { PublicAccount } from "@/lib/universal/cosmo-accounts";
import type { ObjektList } from "@apollo/database/web/types";
import { useEffect, useState } from "react";
import type { PropsWithChildren } from "react";
import { createStore } from "zustand";

interface ProfileProps {
  target: Partial<PublicAccount> | undefined;
  objektLists: ObjektList[];
  lockedObjekts: number[];
  pins: ProfilePin[];
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

    updatePins: (update: (pins: ProfilePin[]) => ProfilePin[]) =>
      set((state) => ({ ...state, pins: update(state.pins) })),

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
  const [store] = useState(() => createProfileStore(props));

  // pins follow their query, which pin toggles outside the profile write to
  useEffect(() => {
    if (props.pins !== undefined) store.setState({ pins: props.pins });
  }, [store, props.pins]);

  return (
    <ProfileContext.Provider value={store}>{children}</ProfileContext.Provider>
  );
}
