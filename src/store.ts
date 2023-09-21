import { User } from "@ramper/ethereum";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ValidArtist } from "./lib/server/cosmo/common";

interface AuthState {
  ramperUser: User | null;
  setRamperUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  ramperUser: null,
  setRamperUser: (user: User | null) => set(() => ({ ramperUser: user })),
}));

interface SettingsState {
  artist: ValidArtist | null;
  setArtist: (artist: ValidArtist | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      artist: null,
      setArtist: (artist: ValidArtist | null) =>
        set(() => ({ artist: artist })),
    }),
    {
      name: "cosmo-settings",
      version: 1,
    }
  )
);
