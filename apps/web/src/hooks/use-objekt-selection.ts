import { m } from "@/i18n/messages";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { MAX_OBJEKT_SELECTIONS } from "@/lib/universal/schema/objekt-list";
import { toast } from "sonner";
import { create } from "zustand";

export type SelectedObjekt = {
  collection: Objekt.Collection;
  token: Objekt.Token;
};

type ObjektSelectionState = {
  selected: SelectedObjekt[];
  select: (objekt: SelectedObjekt) => void;
  isSelected: (tokenId: number) => boolean;
  hasSelected: (tokenIds: number[]) => boolean;
  remove: (tokenId: number) => void;
  reset: () => void;
};

/**
 * Multi-select store for batch-adding owned objekts to a list from the user's
 * own profile. Holds the full objekt so previews and payloads need no re-fetch.
 */
export const useObjektSelection = create<ObjektSelectionState>()(
  (set, get) => ({
    selected: [],

    /**
     * Toggle an objekt in the selection, keyed by token id. Caps the selection at
     * MAX_SELECTIONS, surfacing a toast when a new pick would overflow.
     */
    select: (objekt) =>
      set((state) => {
        const exists = state.selected.some(
          (s) => s.token.tokenId === objekt.token.tokenId,
        );

        if (exists) {
          return {
            selected: state.selected.filter(
              (s) => s.token.tokenId !== objekt.token.tokenId,
            ),
          };
        }

        if (state.selected.length >= MAX_OBJEKT_SELECTIONS) {
          toast.info(
            m.toast_max_selections({ count: MAX_OBJEKT_SELECTIONS.toString() }),
          );
          return state;
        }

        return { selected: [...state.selected, objekt] };
      }),

    /**
     * Whether the given token is currently selected.
     */
    isSelected: (tokenId) =>
      get().selected.some((s) => s.token.tokenId === tokenId),

    /**
     * Whether any of the given tokens are currently selected.
     */
    hasSelected: (tokenIds) =>
      get().selected.some((s) => tokenIds.includes(s.token.tokenId)),

    /**
     * Remove a single token from the selection.
     */
    remove: (tokenId) =>
      set((state) => ({
        selected: state.selected.filter((s) => s.token.tokenId !== tokenId),
      })),

    /**
     * Clear the entire selection.
     */
    reset: () => set({ selected: [] }),
  }),
);
