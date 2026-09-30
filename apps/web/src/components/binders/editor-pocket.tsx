import { m } from "@/i18n/messages";
import { pocketObjektName } from "@/lib/universal/binders";
import type { BinderPocketEntry } from "@/lib/universal/binders";
import { cn } from "@/lib/utils";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { IconPhotoStar, IconX } from "@tabler/icons-react";
import { memo } from "react";
import type { MouseEvent, ReactNode } from "react";
import { PocketSleeve } from "./binder-page";
import type { EditorDragData } from "./editor-dnd";

/**
 * The selected pocket's ring. The narrow layout only shows it while the
 * picker sheet is open, so `wideRing` is the same ring from `lg` up only.
 */
const ring =
  "z-1 shadow-[0_0_0_2px_var(--color-cosmo-text),0_0_0_5px_color-mix(in_oklch,var(--color-cosmo)_25%,transparent)] focus-visible:shadow-[0_0_0_2px_var(--color-foreground),0_0_0_5px_color-mix(in_oklch,var(--color-cosmo)_25%,transparent)] md:shadow-[0_0_0_2px_var(--color-cosmo-text),0_0_0_7px_color-mix(in_oklch,var(--color-cosmo)_22%,transparent)]";
const wideRing =
  "lg:z-1 lg:shadow-[0_0_0_2px_var(--color-cosmo-text),0_0_0_7px_color-mix(in_oklch,var(--color-cosmo)_22%,transparent)]";

type Props = {
  slot: number;
  entry: BinderPocketEntry | undefined;
  /** the pocket the next pick fills */
  selected: boolean;
  /** the picker sheet is open, so the narrow layout marks the selection too */
  picking: boolean;
  isCover: boolean;
  onSelect: (slot: number, event: MouseEvent<HTMLButtonElement>) => void;
  onClear: (slot: number) => void;
  onSetCover: (tokenId: number | null) => void;
};

/**
 * A pocket in the editor: a button that selects it, labelled with its number
 * and contents, plus clear and cover buttons for a filled pocket. It takes
 * drops from the picker and other pockets, and can be dragged itself once it
 * holds an objekt. The ring marks the selected pocket, the one the next pick
 * fills.
 */
const EditorPocket = memo(function EditorPocket({
  slot,
  entry,
  selected,
  picking,
  isCover,
  onSelect,
  onClear,
  onSetCover,
}: Props) {
  const pocket = slot + 1;
  const id = `pocket-${slot}`;
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id,
    data: { slot },
  });
  const {
    setNodeRef: setDragRef,
    attributes,
    listeners,
    isDragging,
  } = useDraggable({
    id,
    disabled: entry === undefined,
    data: {
      drag:
        entry === undefined
          ? undefined
          : ({
              kind: "pocket",
              slot,
              objekt: entry.objekt,
            } satisfies EditorDragData),
    },
  });

  return (
    <div
      ref={setDropRef}
      data-slot={slot}
      className={cn(
        "group/pocket @container relative transition-transform duration-150",
        isOver && "scale-[0.97]",
      )}
    >
      <button
        ref={setDragRef}
        type="button"
        // an empty pocket isn't draggable, so it keeps its plain button semantics
        {...(entry === undefined ? undefined : attributes)}
        {...listeners}
        aria-pressed={selected}
        aria-label={pocketLabel(pocket, entry, isCover)}
        onClick={(event) => onSelect(slot, event)}
        className={cn(
          // no text magnifier or image menu on the hold that starts a touch drag
          "relative block w-full touch-manipulation rounded-photocard transition-[box-shadow,opacity] duration-150 outline-none select-none [-webkit-touch-callout:none] focus-visible:shadow-[0_0_0_2px_var(--color-foreground)]",
          selected && (picking ? ring : wideRing),
          isOver && "shadow-[0_0_0_2px_var(--color-emerald-500)]",
          isDragging && "opacity-40",
        )}
      >
        <PocketSleeve objekt={entry?.objekt} priority />
        <span className="absolute top-[4cqw] left-[4.5cqw] hidden font-mono text-[10px] text-muted-foreground lg:block">
          {pocket}
        </span>
      </button>

      {isCover && (
        <span className="pointer-events-none absolute bottom-[4cqw] left-[4cqw] z-1 inline-flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
          <IconPhotoStar className="size-3" />
          {m.binder_editor_cover()}
        </span>
      )}

      {entry !== undefined && (
        <div
          className={cn(
            "absolute top-[4cqw] right-[4cqw] z-2 flex gap-1",
            // the narrow layout keeps them in the sheet
            "max-lg:hidden",
            /**
             * Beside the picker they show on the selected pocket, on hover or
             * on keyboard focus, and can't be tapped while hidden. A touch
             * screen's first tap then selects the pocket, and the next can
             * clear it.
             */
            !selected &&
              "pointer-events-none opacity-0 transition-opacity group-hover/pocket:pointer-events-auto group-hover/pocket:opacity-100 group-has-[:focus-visible]/pocket:pointer-events-auto group-has-[:focus-visible]/pocket:opacity-100",
          )}
        >
          <PocketAction
            label={m.binder_editor_use_as_cover()}
            pressed={isCover}
            onClick={() =>
              onSetCover(isCover ? null : Number(entry.objekt.tokenId))
            }
          >
            <IconPhotoStar className="size-3.5" />
          </PocketAction>
          <PocketAction
            label={m.binder_editor_clear_pocket_n({ pocket })}
            onClick={() => onClear(slot)}
          >
            <IconX className="size-3.5" />
          </PocketAction>
        </div>
      )}
    </div>
  );
});

export default EditorPocket;

function pocketLabel(
  pocket: number,
  entry: BinderPocketEntry | undefined,
  isCover: boolean,
) {
  if (entry === undefined) return m.binder_editor_pocket_empty({ pocket });
  const objekt = pocketObjektName(entry.objekt);
  return isCover
    ? m.binder_editor_pocket_cover({ pocket, objekt })
    : m.binder_editor_pocket_filled({ pocket, objekt });
}

type PocketActionProps = {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
};

function PocketAction({
  label,
  pressed,
  onClick,
  children,
}: PocketActionProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={onClick}
      className="grid size-[22px] place-items-center rounded-md bg-black/60 text-white transition-colors hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-cosmo-text aria-pressed:bg-cosmo aria-pressed:hover:bg-cosmo-hover"
    >
      {children}
    </button>
  );
}
