import { useBinderMutations } from "@/hooks/use-binder-mutations";
import { m } from "@/i18n/messages";
import {
  MAX_BINDER_PAGES,
  movedPage,
  nextEmptySlot,
  pageDrop,
  suggestFromNeighbours,
  withPlacedObjekt,
  withSwappedPockets,
} from "@/lib/universal/binders";
import type {
  BinderDetail,
  BinderLayout,
  BinderObjekt,
} from "@/lib/universal/binders";
import { arrayMove } from "@dnd-kit/sortable";
import { useState } from "react";
import { toast } from "sonner";

type Options = {
  binder: BinderDetail;
  userId: string;
  initialPage: number;
};

/**
 * Editor state shared by the desktop and phone layouts: the page on screen,
 * the selected pocket, and every edit expressed against that page. Picking
 * fills the selected pocket, then selects the next empty pocket on the page.
 */
export function useBinderEditor({ binder, userId, initialPage }: Options) {
  const mutations = useBinderMutations({
    binderId: binder.id,
    userId,
    slug: binder.slug,
  });
  const [pageIndex, setPageIndex] = useState(initialPage);

  // the page count can shrink under the editor, from here or another tab
  const page = Math.min(pageIndex, binder.pageCount - 1);
  const [selected, setSelected] = useState(() =>
    nextEmptySlot(binder.layout, binder.entries, page, -1),
  );
  const pockets = new Map(
    binder.entries
      .filter((entry) => entry.page === page)
      .map((entry) => [entry.slot, entry]),
  );

  /**
   * A key per page that moves with it, so page thumbnails keep their identity,
   * and keyboard focus, through a reorder. Pages added since the last move
   * get fresh keys.
   */
  const [movedKeys, setMovedKeys] = useState<readonly number[]>([]);
  const keptKeys = movedKeys.slice(0, binder.pageCount);
  const freshKey = Math.max(-1, ...movedKeys) + 1;
  const pageKeys = [
    ...keptKeys,
    ...Array.from(
      { length: binder.pageCount - keptKeys.length },
      (_, index) => freshKey + index,
    ),
  ];

  function goToPage(next: number) {
    setPageIndex(next);
    setSelected(nextEmptySlot(binder.layout, binder.entries, next, -1));
  }

  /**
   * Place an objekt into a pocket on this page, returning the next empty
   * pocket after it.
   */
  function place(slot: number, objekt: BinderObjekt) {
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
    pageKeys,
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
    pick(objekt: BinderObjekt) {
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
    /**
     * Move a page to a new position. The page on screen stays on screen,
     * wherever it ends up.
     */
    movePage(from: number, to: number) {
      if (from === to) return;
      mutations.move({ from, to });
      setMovedKeys(arrayMove(pageKeys, from, to));
      setPageIndex(movedPage(page, from, to));
    },
    /**
     * Move a pocket on this page into the first empty pocket of another page,
     * for a pocket dropped on that page's thumbnail.
     */
    moveToPage(slot: number, target: number) {
      const objekt = pockets.get(slot)?.objekt;
      if (objekt === undefined) return;
      const drop = pageDrop(binder, target, objekt.tokenId);
      if (drop.kind === "full") {
        toast.info(m.binder_editor_page_n_full({ page: target + 1 }));
      } else if (drop.kind === "pocket") {
        mutations.swap({
          from: { page, slot },
          to: { page: target, slot: drop.slot },
        });
      }
    },
    /**
     * Fill the first empty pocket of a page, for a picker card dropped on that
     * page's thumbnail.
     */
    placeOnPage(target: number, objekt: BinderObjekt) {
      const drop = pageDrop(binder, target, objekt.tokenId);
      if (drop.kind === "full") {
        toast.info(m.binder_editor_page_n_full({ page: target + 1 }));
        return;
      }
      if (drop.kind === "stays") return;
      if (target !== page) {
        mutations.place({ page: target, slot: drop.slot, objekt });
        return;
      }
      const next = place(drop.slot, objekt);
      // filling the selected pocket moves the selection on, as a pick does
      if (drop.slot === selected) setSelected(next);
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
