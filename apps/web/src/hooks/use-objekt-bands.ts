import { create } from "zustand";

type ObjektBandStand = {
  hidden: boolean;
  toggleHidden: () => void;
};

export const useObjektBands = create<ObjektBandStand>()((set) => ({
  hidden: false,
  toggleHidden: () => set((state) => ({ hidden: !state.hidden })),
}));
