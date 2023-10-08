import { User } from "@ramper/ethereum";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  ramperUser: User | null;
  setRamperUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  ramperUser: null,
  setRamperUser: (user: User | null) => set(() => ({ ramperUser: user })),
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
