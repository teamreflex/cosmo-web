import { useBinderMutations } from "@/hooks/use-binder-mutations";
import { m } from "@/i18n/messages";
import {
  MAX_BINDER_PAGES,
  nextEmptySlot,
  suggestFromNeighbours,
  withPlacedObjekt,
  withSwappedPockets,
} from "@/lib/universal/binders";
import type { BinderDetail, BinderLayout } from "@/lib/universal/binders";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import { useState } from "react";
import { toast } from "sonner";

type Options = {
  binder: BinderDetail;
  userId: string;
};

/**
 * Editor state shared by the desktop and phone layouts: the page on screen,
 * the selected pocket, and every edit expressed against that page. Picking
 * fills the selected pocket, then selects the next empty pocket on the page.
 */
export function useBinderEditor({ binder, userId }: Options) {
  const mutations = useBinderMutations({
    binderId: binder.id,
    userId,
    slug: binder.slug,
  });
  const [pageIndex, setPageIndex] = useState(0);
  const [selected, setSelected] = useState(() =>
    nextEmptySlot(binder.layout, binder.entries, 0, -1),
  );

  // the page count can shrink under the editor, from here or another tab
  const page = Math.min(pageIndex, binder.pageCount - 1);
  const pockets = new Map(
    binder.entries
      .filter((entry) => entry.page === page)
      .map((entry) => [entry.slot, entry]),
  );

  function goToPage(next: number) {
    setPageIndex(next);
    setSelected(nextEmptySlot(binder.layout, binder.entries, next, -1));
  }

  /**
   * Place an objekt into a pocket on this page, returning the next empty
   * pocket after it.
   */
  function place(slot: number, objekt: CosmoObjekt) {
    if (pockets.get(slot)?.objekt.tokenId !== objekt.tokenId) {
      mutations.place({ page, slot, objekt });
    }
    return nextEmptySlot(
      binder.layout,
      withPlacedObjekt(binder, { page, slot }, objekt).entries,
      page,
      slot,
    );
  }

  return {
    binder,
    page,
    pockets,
    selected,
    select: setSelected,
    saving: mutations.pending,
    inBinderTokenIds: new Set(
      binder.entries.map((entry) => Number(entry.objekt.tokenId)),
    ),
    suggestion:
      selected === null
        ? null
        : suggestFromNeighbours(binder.entries, { page, slot: selected }),
    canAddPage: binder.pageCount < MAX_BINDER_PAGES,
    goToPage,
    place,
    /**
     * Fill the selected pocket and move the selection on. Returns the pocket
     * selected next, which is null once the page is full.
     */
    pick(objekt: CosmoObjekt) {
      if (selected === null) {
        toast.info(m.binder_editor_select_pocket());
        return null;
      }
      const next = place(selected, objekt);
      setSelected(next);
      return next;
    },
    clear(slot: number) {
      mutations.clear({ page, slot });
    },
    swap(from: number, to: number) {
      if (from === to) return;
      const move = { from: { page, slot: from }, to: { page, slot: to } };
      mutations.swap(move);
      // moving into the selected pocket fills it, so the selection moves on
      if (selected === to && !pockets.has(to)) {
        setSelected(
          nextEmptySlot(
            binder.layout,
            withSwappedPockets(binder, move.from, move.to).entries,
            page,
            to,
          ),
        );
      }
    },
    addPage() {
      mutations.addPage();
      setPageIndex(binder.pageCount);
      setSelected(0);
    },
    removeLastPage() {
      mutations.removeLastPage();
      if (page === binder.pageCount - 1) goToPage(page - 1);
    },
    setCover(tokenId: number | null) {
      mutations.setCover(tokenId);
    },
    setLayout(layout: BinderLayout) {
      mutations.setLayout(layout);
      setSelected(0);
    },
  };
}

export type BinderEditor = ReturnType<typeof useBinderEditor>;
