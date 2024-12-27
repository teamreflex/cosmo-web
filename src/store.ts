import { create } from "zustand";
import { persist } from "zustand/middleware";

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
