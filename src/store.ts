import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PublicProfile } from "./lib/universal/cosmo/auth";

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
interface SearchState {
  recentLookups: PublicProfile[];
  addRecentLookup: (lookup: PublicProfile) => void;
  recentSends: PublicProfile[];
  addRecentSend: (send: PublicProfile) => void;
}
export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      recentLookups: [],
      addRecentLookup: (lookup: PublicProfile) =>
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
      addRecentSend: (send: PublicProfile) =>
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
