import { User } from "@ramper/ethereum";
import { create } from "zustand";

interface AuthState {
  ramperUser: User | null;
  setRamperUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  ramperUser: null,
  setRamperUser: (user: User | null) => set(() => ({ ramperUser: user })),
}));
