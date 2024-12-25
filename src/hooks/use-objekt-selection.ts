import { toast } from "@/components/ui/use-toast";
import { CosmoPublicUser } from "@/lib/universal/cosmo/auth";
import type { Hex } from "viem";
import { create } from "zustand";

type SelectedObjekt = {
  tokenId: number;
  contract: string;
  collectionId: string;
  collectionNo: string;
  serial: number;
  thumbnailImage: string;
};

export type SelectionIdle = {
  status: "idle";
  objekt: SelectedObjekt;
  hash: null;
  recipient: CosmoPublicUser;
};

type SelectionRecipientPending = {
  status: "idle";
  objekt: SelectedObjekt;
  hash: null;
  recipient: null;
};

export type SelectionSuccess = {
  status: "success";
  objekt: SelectedObjekt;
  hash: string;
  recipient: CosmoPublicUser;
};

export type SelectionError = {
  status: "error";
  objekt: SelectedObjekt;
  hash: null;
  recipient: CosmoPublicUser;
};

type SelectionPending = {
  status: "pending";
  objekt: SelectedObjekt;
  hash: null;
  recipient: CosmoPublicUser;
};

export type SelectionCanceled = {
  status: "canceled";
  objekt: SelectedObjekt;
  hash: null;
  recipient: CosmoPublicUser;
};

export type Selection =
  | SelectionIdle
  | SelectionRecipientPending
  | SelectionSuccess
  | SelectionError
  | SelectionPending
  | SelectionCanceled;

type ObjektSelectionState = {
  // drawer state
  open: boolean;
  setOpen: (open: boolean) => void;

  // selected objekts
  selected: Selection[];
  select: (objekt: SelectedObjekt) => void;
  update: (selection: Selection) => void;
  selectUser: (user: CosmoPublicUser) => void;
  isSelected: (tokenId: number) => boolean;
  reset: () => void;
  remove: (tokenId: number) => void;
};

export const useObjektSelection = create<ObjektSelectionState>()(
  (set, get) => ({
    // drawer state
    open: false,
    setOpen: (open) => set({ open }),

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

        // TODO: add scroll area to the drawer to support more
        if (!existing && state.selected.length >= 5) {
          toast({
            description: "Currently only 5 objekts can be selected",
          });
          return state;
        }

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
              status: "idle",
              recipient: null,
              hash: null,
            } satisfies SelectionRecipientPending,
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

    /**
     * Remove a selected objekt, close the drawer if no objekts are left
     */
    remove: (tokenId) =>
      set((state) => {
        const selected = state.selected.filter(
          (p) => p.objekt.tokenId !== tokenId
        );

        return {
          ...state,
          open: selected.length > 0,
          selected,
        };
      }),
  })
);
