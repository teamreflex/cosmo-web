import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SearchUser } from "./lib/universal/cosmo/auth";

/**
 * store for various settings in the app
 */
interface SettingsState {
  warned: boolean;
  setWarned: (state: boolean) => void;
}
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      warned: false,
      setWarned: (state: boolean) => set(() => ({ warned: state })),
    }),
    {
      name: "settings",
      partialize: (state) => ({ warned: state.warned }),
      version: 1,
      // cba validating the type here
      migrate: (prevState: any, version) => {
        if (version === 0) {
          prevState.warned = false;
        }
        return prevState;
      },
    }
  )
);

/**
 * store recent user searches
 */
interface SearchState {
  recentLookups: SearchUser[];
  addRecentLookup: (lookup: SearchUser) => void;
  recentSends: SearchUser[];
  addRecentSend: (send: SearchUser) => void;
}
export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      recentLookups: [],
      addRecentLookup: (lookup: SearchUser) =>
        set((state) => {
          const current = state.recentLookups;
          if (current.includes(lookup)) {
            return state;
          }
          if (current.length === 3) {
            current.pop();
          }
          return { recentLookups: [lookup, ...current] };
        }),

      recentSends: [],
      addRecentSend: (send: SearchUser) =>
        set((state) => {
          const current = state.recentSends;
          if (current.includes(send)) {
            return state;
          }
          if (current.length === 3) {
            current.pop();
          }
          return { recentSends: [send, ...current] };
        }),
    }),
    {
      name: "searches",
    }
  )
);
