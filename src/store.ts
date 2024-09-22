import { create } from "zustand";
import { persist } from "zustand/middleware";

type Warning = "first-visit" | "data-source";

/**
 * store for various settings in the app
 */
interface SettingsState {
  warnings: Record<Warning, boolean>;
  toggleWarning: (type: Warning) => void;
}
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      warnings: {
        "first-visit": false,
        "data-source": false,
      },
      toggleWarning: (type: Warning) =>
        set((state) => ({
          warnings: { ...state.warnings, [type]: !state.warnings[type] },
        })),
    }),
    {
      name: "settings",
      partialize: (state) => ({ warnings: state.warnings }),
      version: 2,
      // cba validating the type here
      migrate: (prevState: any, version) => {
        // reset the first-visit warning
        if (version === 0) {
          prevState.warned = false;
        }
        // migrate over to object
        if (version === 1) {
          prevState.warnings = {
            "first-visit": prevState.warned,
            "data-source": false,
          };
        }
        return prevState;
      },
    }
  )
);

/**
 * store recent user searches
 */

export type RecentUser = {
  nickname: string;
  address: string;
  profileImageUrl: string;
};

interface SearchState {
  recentLookups: RecentUser[];
  addRecentLookup: (lookup: RecentUser) => void;
}
export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      recentLookups: [],
      addRecentLookup: (lookup: RecentUser) =>
        set((state) => {
          const current = state.recentLookups;
          const currentIndex = current.findIndex(
            (l) => l.nickname.toLowerCase() === lookup.nickname.toLowerCase()
          );
          if (currentIndex !== -1) {
            return state;
          }
          if (current.length === 3) {
            current.pop();
          }
          return { recentLookups: [lookup, ...current] };
        }),
    }),
    {
      name: "searches",
    }
  )
);
