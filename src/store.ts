import { User } from "@ramper/ethereum";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ValidArtist, SearchUser } from "@/lib/universal/cosmo";

/**
 * store for the current user
 */
interface AuthState {
  ramperUser: User | null;
  setRamperUser: (user: User | null) => void;
  comoBalances: Record<ValidArtist, number>;
  setComoBalances: (balances: Record<ValidArtist, number>) => void;
}
export const useAuthStore = create<AuthState>((set) => ({
  ramperUser: null,
  setRamperUser: (user: User | null) => set(() => ({ ramperUser: user })),
  comoBalances: {
    artms: 0,
    tripleS: 0,
  },
  setComoBalances: (balances: Record<ValidArtist, number>) =>
    set(() => ({ comoBalances: balances })),
}));

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
