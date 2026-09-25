import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BinderEditor } from "@/hooks/use-binder-editor";
import { m } from "@/i18n/messages";
import { binderGrid } from "@/lib/universal/binders";
import { cn } from "@/lib/utils";
import {
  IconChevronLeft,
  IconChevronRight,
  IconDots,
  IconPencil,
  IconPhotoStar,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BinderPage } from "./binder-page";
import {
  DoneButton,
  EditorStatus,
  LayoutOptions,
  PageChip,
} from "./editor-controls";
import EditorPocket from "./editor-pocket";
import ObjektPicker from "./objekt-picker";

/**
 * How much of the screen the picker sheet covers; the page shows above it.
 */
const SHEET_HEIGHT = 0.65;

type Props = {
  editor: BinderEditor;
  username: string;
  address: string;
  lockedTokenIds: ReadonlySet<number>;
  onEdit: () => void;
  onDelete: () => void;
  onRemoveLastPage: () => void;
};

/**
 * The phone editor. The page owns the screen; tapping a pocket raises the
 * picker in a sheet that leaves the top of the page in view, and each pick
 * fills the pocket and moves on to the next empty one. Arrange mode replaces
 * drag: tap a filled pocket, then another, to swap or move.
 */
export default function BinderEditorPhone({
  editor,
  username,
  address,
  lockedTokenIds,
  onEdit,
  onDelete,
  onRemoveLastPage,
}: Props) {
  const { binder, page, selected } = editor;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [arranging, setArranging] = useState(false);
  // arrange mode's first tap, waiting for the pocket to swap with
  const [held, setHeld] = useState<number | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // keep the pocket the next pick fills in view above the sheet
  useEffect(() => {
    if (!sheetOpen || selected === null) return;
    revealAboveSheet(
      pageRef.current?.querySelector(`[data-slot="${selected}"]`),
    );
  }, [sheetOpen, selected, page]);

  function tapPocket(slot: number) {
    if (!arranging) {
      editor.select(slot);
      setSheetOpen(true);
      return;
    }
    if (held === null) {
      if (editor.pockets.has(slot)) setHeld(slot);
      else toast.info(m.binder_editor_arrange_pick_filled());
      return;
    }
    editor.swap(held, slot);
    setHeld(null);
  }

  function pick(objekt: Parameters<BinderEditor["pick"]>[0]) {
    if (editor.pick(objekt) === null) {
      setSheetOpen(false);
      toast.success(m.binder_editor_page_full());
    }
  }

  function toggleArrange() {
    setArranging(!arranging);
    setHeld(null);
    setSheetOpen(false);
  }

  const selectedEntry =
    selected === null ? undefined : editor.pockets.get(selected);
  const selectedTokenId =
    selectedEntry === undefined ? null : Number(selectedEntry.objekt.tokenId);
  const selectedIsCover =
    selectedTokenId !== null && selectedTokenId === binder.coverTokenId;

  return (
    <div className="-mx-4 flex flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <DoneButton username={username} slug={binder.slug} />
        <h1 className="min-w-0 flex-1 truncate text-center font-cosmo text-sm font-black uppercase">
          {binder.name}
        </h1>
        <PageChip editor={editor} />
        <PhoneMenu
          editor={editor}
          onEdit={onEdit}
          onDelete={onDelete}
          onRemoveLastPage={onRemoveLastPage}
        />
      </div>

      <div
        className="px-3 py-2.5"
        // room to scroll the bottom row up above the sheet
        style={sheetOpen ? { paddingBottom: `${SHEET_HEIGHT * 100}dvh` } : {}}
      >
        <BinderPage ref={pageRef} layout={binder.layout}>
          {Array.from(
            { length: binderGrid(binder.layout).pocketsPerPage },
            (_, slot) => {
              const entry = editor.pockets.get(slot);
              const tokenId =
                entry === undefined ? null : Number(entry.objekt.tokenId);
              return (
                <div key={slot} data-slot={slot}>
                  <EditorPocket
                    slot={slot}
                    entry={entry}
                    selected={
                      arranging ? held === slot : sheetOpen && selected === slot
                    }
                    isCover={
                      tokenId !== null && tokenId === binder.coverTokenId
                    }
                    numbered={false}
                    actions={arranging ? "always" : "none"}
                    priority
                    onSelect={() => tapPocket(slot)}
                    onClear={() => editor.clear(slot)}
                  />
                </div>
              );
            },
          )}
        </BinderPage>
        <div className="mt-2.5 flex items-center justify-center gap-2 font-mono text-[11px] text-muted-foreground">
          <span>
            {arranging
              ? m.binder_editor_hint_arrange()
              : m.binder_editor_hint_tap()}
          </span>
          <span aria-hidden>·</span>
          <EditorStatus saving={editor.saving} />
        </div>
      </div>

      <div className="sticky bottom-0 z-10 flex gap-2 border-t border-border bg-background px-3 pt-2.5 pb-[max(env(safe-area-inset-bottom),10px)]">
        <Button
          variant="outline"
          className="h-9.5 flex-1"
          aria-label={m.binder_editor_previous_page()}
          disabled={page === 0}
          onClick={() => editor.goToPage(page - 1)}
        >
          <IconChevronLeft />
        </Button>
        <Button
          variant="outline"
          className={cn(
            "h-9.5 flex-1",
            arranging &&
              "border-cosmo-text text-cosmo-text dark:border-cosmo-text",
          )}
          aria-pressed={arranging}
          onClick={toggleArrange}
        >
          {m.binder_editor_arrange()}
        </Button>
        <Button
          variant="cosmo"
          className="h-9.5 flex-1"
          aria-label={m.binder_editor_add_page()}
          disabled={!editor.canAddPage}
          onClick={() => editor.addPage()}
        >
          <IconPlus />
          {m.binder_editor_page()}
        </Button>
        <Button
          variant="outline"
          className="h-9.5 flex-1"
          aria-label={m.binder_editor_next_page()}
          disabled={page === binder.pageCount - 1}
          onClick={() => editor.goToPage(page + 1)}
        >
          <IconChevronRight />
        </Button>
      </div>

      <Drawer
        open={sheetOpen}
        onOpenChange={(open, details) => {
          // pockets stay tappable under the sheet, to pick a different one
          if (
            details.reason === "outside-press" &&
            details.event.target instanceof Node &&
            pageRef.current?.contains(details.event.target) === true
          ) {
            details.cancel();
            return;
          }
          setSheetOpen(open);
        }}
        modal={false}
      >
        <DrawerContent
          style={{ height: `${SHEET_HEIGHT * 100}dvh` }}
          className="max-h-none gap-0 rounded-t-2xl shadow-[0_-20px_40px_rgb(0_0_0/0.5)]"
          initialFocus={false}
        >
          <div className="flex items-center gap-2 px-3 pt-1.5 pb-2">
            <DrawerTitle className="min-w-0 flex-1 truncate text-sm">
              {selected !== null &&
                m.binder_editor_pick_title({ pocket: selected + 1 })}
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              {m.binder_editor_hint_tap()}
            </DrawerDescription>
            {selectedEntry !== undefined && selectedTokenId !== null && (
              <>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={m.binder_editor_use_as_cover()}
                  aria-pressed={selectedIsCover}
                  onClick={() =>
                    editor.setCover(selectedIsCover ? null : selectedTokenId)
                  }
                  className="aria-pressed:border-cosmo aria-pressed:bg-cosmo aria-pressed:text-white"
                >
                  <IconPhotoStar />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selected !== null && editor.clear(selected)}
                >
                  {m.binder_editor_clear_pocket()}
                </Button>
              </>
            )}
            <DrawerClose
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={m.common_close()}
                />
              }
            >
              <IconX />
            </DrawerClose>
          </div>
          <ObjektPicker
            address={address}
            lockedTokenIds={lockedTokenIds}
            inBinderTokenIds={editor.inBinderTokenIds}
            suggestion={editor.suggestion}
            onPick={pick}
            className="min-h-0 flex-1 [&>div:first-child]:pt-0"
          />
        </DrawerContent>
      </Drawer>
    </div>
  );
}

type PhoneMenuProps = {
  editor: BinderEditor;
  onEdit: () => void;
  onDelete: () => void;
  onRemoveLastPage: () => void;
};

/**
 * The phone's overflow menu: name and colour, layout while empty, removing the
 * last page, and delete.
 */
function PhoneMenu({
  editor,
  onEdit,
  onDelete,
  onRemoveLastPage,
}: PhoneMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={m.binder_editor_more()}
          />
        }
      >
        <IconDots />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onEdit}>
          <IconPencil />
          {m.binder_editor_edit()}
        </DropdownMenuItem>
        {editor.binder.entries.length === 0 && (
          <>
            <DropdownMenuSeparator />
            <LayoutOptions editor={editor} />
          </>
        )}
        <DropdownMenuSeparator />
        {editor.binder.pageCount > 1 && (
          <DropdownMenuItem onClick={onRemoveLastPage}>
            <IconTrash />
            {m.binder_editor_remove_page()}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <IconTrash />
          {m.binder_editor_delete()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// the sticky navbar's height
const NAVBAR_HEIGHT = 56;

/**
 * Scroll a pocket into the strip between the navbar and the picker sheet, if
 * it's outside it.
 */
function revealAboveSheet(element: Element | null | undefined) {
  if (!element) return;
  const visibleBottom = window.innerHeight * (1 - SHEET_HEIGHT);
  const { top, bottom } = element.getBoundingClientRect();
  if (bottom > visibleBottom) {
    window.scrollBy({ top: bottom - visibleBottom + 8, behavior: "smooth" });
  } else if (top < NAVBAR_HEIGHT) {
    window.scrollBy({ top: top - NAVBAR_HEIGHT - 8, behavior: "smooth" });
  }
}
