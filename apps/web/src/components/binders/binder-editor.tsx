import { useBinderEditor } from "@/hooks/use-binder-editor";
import { usePinsCache } from "@/hooks/use-profile-pins";
import { m } from "@/i18n/messages";
import {
  binderMenuKey,
  binderQuery,
  binderShelfQuery,
} from "@/lib/queries/binders";
import { binderGrid, isBinderPin } from "@/lib/universal/binders";
import type { BinderDetail } from "@/lib/universal/binders";
import { cn } from "@/lib/utils";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import type { Binder } from "@apollo/database/web/types";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import { useEventCallback } from "usehooks-ts";
import { BinderPage } from "./binder-page";
import BinderSettingsDialog from "./binder-settings-dialog";
import {
  EditorHeader,
  EditorHints,
  EditorStatus,
  PageControls,
} from "./editor-controls";
import { DeleteBinderDialog, RemovePageDialog } from "./editor-dialogs";
import EditorDndContext from "./editor-dnd";
import EditorPickerPanel from "./editor-picker-panel";
import EditorPocket from "./editor-pocket";

/**
 * Where the page and the picker sit side by side, matching Tailwind's `lg`.
 * Below it the picker is a sheet.
 */
const SIDE_BY_SIDE = "(width >= 64rem)";

// the sticky navbar's height
const NAVBAR_HEIGHT = 56;

type Props = {
  binder: BinderDetail;
  /** the zero-based page to open on */
  initialPage: number;
  owner: {
    userId: string;
    /** the identifier the profile routes under */
    username: string;
    address: string;
    lockedTokenIds: ReadonlySet<number>;
  };
};

/**
 * The owner's binder editor.
 */
export default function BinderEditor({ binder, initialPage, owner }: Props) {
  const editor = useBinderEditor({
    binder,
    userId: owner.userId,
    initialPage,
  });
  const queryClient = useQueryClient();
  const pins = usePinsCache();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<
    "settings" | "delete" | "remove-page" | null
  >(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLElement>(null);

  const { selected } = editor;
  const { columns, rows, pocketsPerPage } = binderGrid(binder.layout);
  const lastPageCount = binder.entries.filter(
    (entry) => entry.page === binder.pageCount - 1,
  ).length;

  // keep the pocket the next pick fills in view above the sheet, also after rotating into it
  useEffect(() => {
    if (!sheetOpen || selected === null) return;
    const reveal = () => {
      if (isSideBySide()) return;
      revealAboveSheet(
        pageRef.current?.querySelector(`[data-slot="${selected}"]`),
        sheetRef.current,
      );
    };
    reveal();
    const layout = window.matchMedia(SIDE_BY_SIDE);
    layout.addEventListener("change", reveal);
    return () => layout.removeEventListener("change", reveal);
  }, [sheetOpen, selected]);

  // stable, so a pocket only re-renders when its own contents or state change
  const tapPocket = useEventCallback(
    (slot: number, event: MouseEvent<HTMLButtonElement>) => {
      editor.select(slot);
      // a key press carries on into the sheet, once it's shown
      if (event.detail === 0 && !isSideBySide()) {
        flushSync(() => setSheetOpen(true));
        sheetRef.current?.focus({ preventScroll: true });
      } else {
        setSheetOpen(true);
      }
    },
  );
  const clearPocket = useEventCallback((slot: number) => {
    editor.clear(slot);
    // its clear button goes with the objekt
    pocketButton(slot)?.focus({ preventScroll: true });
  });
  const setCover = useEventCallback((tokenId: number | null) =>
    editor.setCover(tokenId),
  );

  function pocketButton(slot: number) {
    return (
      pageRef.current?.querySelector<HTMLElement>(
        `[data-slot="${slot}"] > button`,
      ) ?? null
    );
  }

  function closeSheet(focusSlot = selected) {
    setSheetOpen(false);
    // focus left in the sheet would drop to the page as it hides
    if (
      focusSlot !== null &&
      !isSideBySide() &&
      sheetRef.current?.contains(document.activeElement) === true
    ) {
      pocketButton(focusSlot)?.focus({ preventScroll: true });
    }
  }

  function closeOnEscape(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && sheetOpen) closeSheet();
  }

  function pick(objekt: CosmoObjekt) {
    const filled = selected;
    if (editor.pick(objekt) !== null || filled === null) return;
    toast.success(m.binder_editor_page_full());
    closeSheet(filled);
  }

  function removeLastPage() {
    if (lastPageCount > 0) {
      setDialog("remove-page");
      return;
    }
    editor.removeLastPage();
    // the remove button goes when one page is left
    pocketButton(0)?.focus({ preventScroll: true });
  }

  function closeDialog(open: boolean) {
    if (!open) setDialog(null);
  }

  /**
   * A rename changes the slug, and with it the route and the binder's cache
   * key, so the saved binder is seeded under the new key before moving there.
   */
  function handleSaved(row: Binder) {
    // not what's cached under the new slug, which may be an older binder's
    queryClient.setQueryData(binderQuery(owner.userId, row.slug).queryKey, {
      ...binder,
      ...row,
    });
    void queryClient.invalidateQueries({
      queryKey: binderShelfQuery(owner.userId).queryKey,
    });
    void queryClient.resetQueries({ queryKey: binderMenuKey });
    pins.refreshBinder(row.id);
    if (row.slug !== binder.slug) {
      void navigate({
        to: "/@{$username}/binder/$slug",
        params: { username: owner.username, slug: row.slug },
        replace: true,
      });
    }
  }

  async function handleDeleted() {
    void queryClient.invalidateQueries({
      queryKey: binderShelfQuery(owner.userId).queryKey,
    });
    void queryClient.resetQueries({ queryKey: binderMenuKey });
    pins.update((current) =>
      current.filter((pin) => !isBinderPin(binder.id)(pin)),
    );
    await navigate({
      to: "/@{$username}",
      params: { username: owner.username },
    });
    // dropped once the editor has unmounted, so it can't refetch the binder
    queryClient.removeQueries({
      queryKey: binderQuery(owner.userId, binder.slug).queryKey,
    });
  }

  return (
    // the narrow layout sits flush with the screen edges, the navbar and the bottom
    <div className="-mx-4 -my-4 lg:mx-0 lg:my-0">
      <EditorDndContext editor={editor} pickerRef={sheetRef}>
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:overflow-hidden lg:rounded-xl lg:border lg:border-border xl:grid-cols-[minmax(0,1fr)_minmax(300px,440px)]">
          <div className="flex min-w-0 flex-col lg:gap-2.5 lg:border-r lg:border-border lg:p-4.5">
            <EditorHeader
              editor={editor}
              username={owner.username}
              onEdit={() => setDialog("settings")}
              onDelete={() => setDialog("delete")}
              onRemoveLastPage={removeLastPage}
            />

            <div
              onKeyDown={closeOnEscape}
              className={cn(
                "px-3 py-2.5 lg:p-0",
                // room to scroll the bottom row up above the sheet
                sheetOpen && "max-lg:pb-[65dvh]",
              )}
            >
              <BinderPage
                ref={pageRef}
                layout={binder.layout}
                // sized so the whole page fits under the navbar with its controls
                style={{ "--page-ratio": (columns * 5.5) / (rows * 8.5) }}
                className="mx-auto w-full max-w-[calc(max(30rem,100dvh-14rem)*var(--page-ratio))] lg:max-w-[calc(max(30rem,100dvh-19rem)*var(--page-ratio))]"
              >
                {Array.from({ length: pocketsPerPage }, (_, slot) => {
                  const entry = editor.pockets.get(slot);
                  return (
                    <EditorPocket
                      key={slot}
                      slot={slot}
                      entry={entry}
                      selected={selected === slot}
                      picking={sheetOpen}
                      isCover={
                        entry !== undefined &&
                        Number(entry.objekt.tokenId) === binder.coverTokenId
                      }
                      onSelect={tapPocket}
                      onClear={clearPocket}
                      onSetCover={setCover}
                    />
                  );
                })}
              </BinderPage>
              {/* the status wraps under a long hint, keeping its dot */}
              <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-2 text-center font-mono text-[11px] text-muted-foreground lg:hidden">
                <span>{m.binder_editor_hint_tap()}</span>
                <span className="flex gap-2">
                  <span aria-hidden>·</span>
                  <EditorStatus saving={editor.saving} />
                </span>
              </div>
            </div>

            <PageControls
              editor={editor}
              sheetOpen={sheetOpen}
              onRemoveLastPage={removeLastPage}
            />
            <EditorHints />
          </div>

          <EditorPickerPanel
            sheetRef={sheetRef}
            editor={editor}
            open={sheetOpen}
            address={owner.address}
            lockedTokenIds={owner.lockedTokenIds}
            onPick={pick}
            onClose={() => closeSheet()}
            onKeyDown={closeOnEscape}
          />
        </div>
      </EditorDndContext>

      <BinderSettingsDialog
        binder={binder}
        open={dialog === "settings"}
        onOpenChange={closeDialog}
        onSaved={handleSaved}
      />
      <DeleteBinderDialog
        binderId={binder.id}
        name={binder.name}
        open={dialog === "delete"}
        onOpenChange={closeDialog}
        onDeleted={() => void handleDeleted()}
      />
      <RemovePageDialog
        page={binder.pageCount}
        objektCount={lastPageCount}
        open={dialog === "remove-page"}
        onOpenChange={closeDialog}
        onConfirm={() => editor.removeLastPage()}
        focusAfterRemove={() => pocketButton(0)}
      />
    </div>
  );
}

/**
 * Checked in effects and handlers only, so the server and the first client
 * render stay the same for every screen.
 */
function isSideBySide() {
  return window.matchMedia(SIDE_BY_SIDE).matches;
}

/**
 * Scroll a pocket into the strip between the navbar and the picker sheet, if
 * it's outside it.
 */
function revealAboveSheet(
  element: Element | null | undefined,
  sheet: HTMLElement | null,
) {
  if (!element || sheet === null) return;
  // the sheet's resting height, while it may still be sliding up
  const visibleBottom = window.innerHeight - sheet.offsetHeight;
  const { top, bottom } = element.getBoundingClientRect();
  if (bottom > visibleBottom) {
    window.scrollBy({ top: bottom - visibleBottom + 8, behavior: "smooth" });
  } else if (top < NAVBAR_HEIGHT) {
    window.scrollBy({ top: top - NAVBAR_HEIGHT - 8, behavior: "smooth" });
  }
}
