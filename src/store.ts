import { User } from "@ramper/ethereum";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ValidArtist } from "./lib/server/cosmo";

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
