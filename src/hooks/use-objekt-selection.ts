import { CosmoPublicUser } from "@/lib/universal/cosmo/auth";
import { MutationStatus } from "@tanstack/react-query";
import { Dispatch, SetStateAction } from "react";
import { create } from "zustand";

type SelectedObjekt = {
  tokenId: number;
  contract: string;
  collectionId: string;
  collectionNo: string;
  serial: number;
  thumbnailImage: string;
};

export type Selection = {
  objekt: SelectedObjekt;
  status: MutationStatus;
  recipient: CosmoPublicUser | null;
};

type ObjektSelectionState = {
  selected: Selection[];
  select: (objekt: SelectedObjekt) => void;
  update: (selection: Selection) => void;
  selectUser: (user: CosmoPublicUser) => void;
  isSelected: (tokenId: number) => boolean;
  reset: () => void;
};

export const useObjektSelection = create<ObjektSelectionState>()(
  (set, get) => ({
    /**
     * Currently selected objekts
     */
    selected: [],

    /**
     * Toggle a selected objekt
     */
    select: (objekt) =>
      set((state) => {
        const existing = state.selected.find(
          (p) => p.objekt.tokenId === objekt.tokenId
        );

        if (existing) {
          return {
            ...state,
            selected: state.selected.filter(
              (p) => p.objekt.tokenId !== objekt.tokenId
            ),
          };
        }

        return {
          ...state,
          selected: [
            ...state.selected,
            {
              objekt,
              status: "pending",
              recipient: null,
            },
          ],
        };
      }),

    /**
     * Determine whether the specific token has been selected.
     */
    isSelected: (tokenId) =>
      get().selected.findIndex((p) => p.objekt.tokenId === tokenId) !== -1,

    /**
     * Reset any selected objekts
     */
    reset: () => set((state) => ({ ...state, selected: [] })),

    /**
     * Update a selected objekt
     */
    update: (selection) =>
      set((state) => {
        const existing = state.selected.find(
          (p) => p.objekt.tokenId === selection.objekt.tokenId
        );

        if (existing) {
          return {
            ...state,
            selected: state.selected.map((p) =>
              p.objekt.tokenId === selection.objekt.tokenId ? selection : p
            ),
          };
        }

        return {
          ...state,
          selected: [...state.selected, selection],
        };
      }),

    /**
     * Select a user to send all objekts to
     */
    selectUser: (user) =>
      set((state) => {
        return {
          ...state,
          selected: state.selected.map((sel) => ({
            ...sel,
            recipient: user,
          })),
        };
      }),
  })
);
