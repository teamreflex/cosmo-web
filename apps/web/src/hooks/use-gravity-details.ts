import { create } from "zustand";
import { persist } from "zustand/middleware";

type GravityDetailsState = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

/**
 * Whether the gravity rail shows the gravity's details instead of its leaderboard.
 * Hydration is skipped so the server and first client render agree on the
 * default; the rail rehydrates the stored choice once mounted.
 */
export const useGravityDetails = create<GravityDetailsState>()(
  persist(
    (set) => ({
      open: true,
      setOpen: (open) => set({ open }),
    }),
    {
      name: "gravity-details",
      skipHydration: true,
    },
  ),
);
