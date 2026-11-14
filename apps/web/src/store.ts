import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * store recent user searches
 */

export type RecentUser = {
  nickname: string;
  address: string;
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
            (l) => l.nickname.toLowerCase() === lookup.nickname.toLowerCase(),
          );
          if (currentIndex !== -1) {
            return state;
          }
          return { recentLookups: [lookup, ...current].slice(0, 3) };
        }),
    }),
    {
      name: "searches",
    },
  ),
);
