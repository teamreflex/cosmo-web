import { m } from "@/i18n/messages";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { MAX_OBJEKT_SELECTIONS } from "@/lib/universal/schema/objekt-list";
import { toast } from "sonner";
import { create } from "zustand";

export type SelectedObjekt =
  | { type: "token"; collection: Objekt.Collection; token: Objekt.Token }
  | { type: "collection"; collection: Objekt.Collection };

export type TokenSelection = Extract<SelectedObjekt, { type: "token" }>;

/**
 * Narrow a selection to an owned token instance.
 */
export const isTokenSelection = (s: SelectedObjekt): s is TokenSelection =>
  s.type === "token";

/**
 * Stable selection key for a token instance (profile, per owned serial).
 */
export const tokenKey = (tokenId: number) => `token:${tokenId}`;

/**
 * Stable selection key for a collection (index, no owned serial).
 */
export const collectionKey = (slug: string) => `collection:${slug}`;

/**
 * Derive the selection key for an item from its discriminant.
 */
export const selectionKey = (item: SelectedObjekt) =>
  item.type === "token"
    ? tokenKey(item.token.tokenId)
    : collectionKey(item.collection.slug);

type ObjektSelectionState = {
  selected: SelectedObjekt[];
  select: (item: SelectedObjekt) => void;
  isSelected: (key: string) => boolean;
  hasSelected: (keys: string[]) => boolean;
  remove: (key: string) => void;
  reset: () => void;
};

/**
 * Multi-select store for batch-adding objekts to a list. Holds either owned
 * token instances (profile) or collections (index) as a discriminated union,
 * keyed by a stable selection key so previews and payloads need no re-fetch.
 */
export const useObjektSelection = create<ObjektSelectionState>()(
  (set, get) => ({
    selected: [],

    /**
     * Toggle an item in the selection, keyed by its selection key. Caps the
     * selection at MAX_SELECTIONS, surfacing a toast when a new pick would
     * overflow.
     */
    select: (item) =>
      set((state) => {
        const key = selectionKey(item);
        const exists = state.selected.some((s) => selectionKey(s) === key);

        if (exists) {
          return {
            selected: state.selected.filter((s) => selectionKey(s) !== key),
          };
        }

        if (state.selected.length >= MAX_OBJEKT_SELECTIONS) {
          toast.info(
            m.toast_max_selections({ count: MAX_OBJEKT_SELECTIONS.toString() }),
          );
          return state;
        }

        return { selected: [...state.selected, item] };
      }),

    /**
     * Whether the given selection key is currently selected.
     */
    isSelected: (key) => get().selected.some((s) => selectionKey(s) === key),

    /**
     * Whether any of the given selection keys are currently selected.
     */
    hasSelected: (keys) =>
      get().selected.some((s) => keys.includes(selectionKey(s))),

    /**
     * Remove a single item from the selection by its selection key.
     */
    remove: (key) =>
      set((state) => ({
        selected: state.selected.filter((s) => selectionKey(s) !== key),
      })),

    /**
     * Clear the entire selection.
     */
    reset: () => set({ selected: [] }),
  }),
);
