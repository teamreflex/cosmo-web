import { Button } from "@/components/ui/button";
import type { BinderEditor } from "@/hooks/use-binder-editor";
import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import { IconPhotoStar, IconX } from "@tabler/icons-react";
import { useId, useRef } from "react";
import type { KeyboardEvent, PointerEvent, RefObject } from "react";
import ObjektPicker from "./objekt-picker";

/**
 * A swipe down on the handle past this share of the sheet's height closes it,
 * as does a quicker flick.
 */
const SWIPE_CLOSE_DISTANCE = 0.5;
const SWIPE_CLOSE_VELOCITY = 0.5; // px per ms
const SWIPE_MIN_DISTANCE = 24;

type Props = {
  sheetRef: RefObject<HTMLElement | null>;
  editor: BinderEditor;
  open: boolean;
  address: string;
  lockedTokenIds: ReadonlySet<number>;
  onPick: (objekt: CosmoObjekt) => void;
  onClose: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

/**
 * The picker. From `lg` it's the column beside the page. Below that it's a
 * sheet over the bottom of the screen, raised by tapping a pocket, and
 * lowered by its close button, Escape or a swipe down on its handle. Pockets
 * stay tappable while it's up. Closing moves it off-screen rather than
 * unmounting it, so filters and scroll survive between pockets, and it's
 * never `display: none`, which would collapse the picker's virtualizer.
 */
export default function EditorPickerPanel({
  sheetRef,
  editor,
  open,
  address,
  lockedTokenIds,
  onPick,
  onClose,
  onKeyDown,
}: Props) {
  const titleId = useId();
  const swipe = useRef<{ pointerId: number; y: number; time: number } | null>(
    null,
  );
  const { binder, selected } = editor;
  const selectedEntry =
    selected === null ? undefined : editor.pockets.get(selected);
  const selectedTokenId =
    selectedEntry === undefined ? null : Number(selectedEntry.objekt.tokenId);
  const selectedIsCover =
    selectedTokenId !== null && selectedTokenId === binder.coverTokenId;

  function startSwipe(event: PointerEvent<HTMLDivElement>) {
    // the header's buttons keep their taps
    if (
      !event.isPrimary ||
      (event.target instanceof Element && event.target.closest("button"))
    ) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    swipe.current = {
      pointerId: event.pointerId,
      y: event.clientY,
      time: event.timeStamp,
    };
    sheetRef.current?.setAttribute("data-swiping", "");
  }

  function moveSwipe(event: PointerEvent<HTMLDivElement>) {
    if (swipe.current?.pointerId !== event.pointerId) return;
    const distance = Math.max(0, event.clientY - swipe.current.y);
    sheetRef.current?.style.setProperty("translate", `0 ${distance}px`);
  }

  function endSwipe(event: PointerEvent<HTMLDivElement>) {
    const start = swipe.current;
    const sheet = sheetRef.current;
    if (start?.pointerId !== event.pointerId || sheet === null) return;
    swipe.current = null;
    sheet.removeAttribute("data-swiping");
    sheet.style.removeProperty("translate");
    if (event.type === "pointercancel") return;

    const distance = event.clientY - start.y;
    const velocity = distance / Math.max(1, event.timeStamp - start.time);
    if (
      distance > sheet.offsetHeight * SWIPE_CLOSE_DISTANCE ||
      (distance > SWIPE_MIN_DISTANCE && velocity > SWIPE_CLOSE_VELOCITY)
    ) {
      onClose();
    }
  }

  return (
    <section
      ref={sheetRef}
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className={cn(
        "fixed inset-x-0 bottom-0 z-20 flex h-[65dvh] flex-col rounded-t-2xl border-t border-border bg-background shadow-[0_-20px_40px_rgb(0_0_0/0.15)] outline-none dark:shadow-[0_-20px_40px_rgb(0_0_0/0.5)]",
        "transition-[translate] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:duration-0 motion-reduce:transition-none",
        // shown as soon as it opens, so focus can move in, and hidden once it's slid away
        !open && "invisible translate-y-full transition-[translate,visibility]",
        "lg:visible lg:relative lg:z-auto lg:h-auto lg:min-h-120 lg:translate-none lg:rounded-none lg:border-t-0 lg:bg-muted/30 lg:shadow-none lg:transition-none",
      )}
    >
      <div
        onPointerDown={startSwipe}
        onPointerMove={moveSwipe}
        onPointerUp={endSwipe}
        onPointerCancel={endSwipe}
        className="shrink-0 touch-none lg:hidden"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-foreground/20" />
        <div className="flex items-center gap-2 px-3 pt-1.5 pb-2">
          <h2
            id={titleId}
            className="min-w-0 flex-1 truncate text-sm font-semibold"
          >
            {selected !== null &&
              m.binder_editor_pick_title({ pocket: selected + 1 })}
          </h2>
          {selected !== null && selectedTokenId !== null && (
            <>
              <Button
                variant="outline"
                size="sm"
                aria-label={m.binder_editor_clear_pocket_n({
                  pocket: selected + 1,
                })}
                onClick={() => {
                  editor.clear(selected);
                  // the button goes with the objekt
                  sheetRef.current?.focus({ preventScroll: true });
                }}
              >
                {m.binder_editor_clear_pocket()}
              </Button>
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
            </>
          )}
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={m.common_close()}
            onClick={onClose}
          >
            <IconX />
          </Button>
        </div>
      </div>

      <ObjektPicker
        address={address}
        lockedTokenIds={lockedTokenIds}
        inBinderTokenIds={editor.inBinderTokenIds}
        suggestion={editor.suggestion}
        onPick={onPick}
        className="min-h-0 flex-1 lg:absolute lg:inset-0 max-lg:[&>div:first-child]:pt-0"
      />
    </section>
  );
}
