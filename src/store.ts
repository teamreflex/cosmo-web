import { User } from "@ramper/ethereum";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ValidArtist } from "./lib/server/cosmo/common";
import { CosmoArtist } from "./lib/server/cosmo";

interface AuthState {
  ramperUser: User | null;
  setRamperUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  ramperUser: null,
  setRamperUser: (user: User | null) => set(() => ({ ramperUser: user })),
}));

type AvailableArtists = Partial<Record<ValidArtist, CosmoArtist>>;

interface SettingsState {
  artist: ValidArtist | null;
  setArtist: (artist: ValidArtist | null) => void;
  availableArtists: AvailableArtists;
  setAvailableArtists: (artists: CosmoArtist[]) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      artist: null,
      setArtist: (artist: ValidArtist | null) =>
        set(() => ({ artist: artist })),
      availableArtists: {},
      setAvailableArtists: (artists: CosmoArtist[]) => {
        const mapped = artists.reduce((accumulator, value) => {
          return { ...accumulator, [value.name]: value };
        }, {} as AvailableArtists);

        return set(() => ({ availableArtists: mapped }));
      },
    }),
    {
      name: "cosmo-settings",
      version: 1,
      // only store the selected artist
      partialize: (state) => ({ artist: state.artist }),
    }
  )
);

const groupBy = <T>(
  array: T[],
  predicate: (value: T, index: number, array: T[]) => string
) =>
  array.reduce((acc, value, index, array) => {
    (acc[predicate(value, index, array)] ||= []).push(value);
    return acc;
  }, {} as { [key: string]: T[] });
