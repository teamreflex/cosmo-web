import { m } from "@/i18n/messages";
import { pocketObjektName } from "@/lib/universal/binders";
import type { BinderPocketEntry } from "@/lib/universal/binders";
import { cn } from "@/lib/utils";
import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from "@dnd-kit/core";
import { IconPhotoStar, IconX } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { PocketSleeve } from "./binder-page";

type Props = {
  slot: number;
  entry: BinderPocketEntry | undefined;
  selected: boolean;
  isCover: boolean;
  /** show the pocket number in the corner, on desktop */
  numbered: boolean;
  /** when a filled pocket shows its clear and cover buttons */
  actions: "hover" | "always" | "none";
  priority: boolean;
  onSelect: () => void;
  onClear: () => void;
  onToggleCover?: () => void;
  /** wiring from the desktop editor's drag and drop */
  drag?: {
    setDropRef: (element: HTMLElement | null) => void;
    setDragRef: (element: HTMLElement | null) => void;
    attributes: DraggableAttributes | undefined;
    listeners: DraggableSyntheticListeners;
    isDragging: boolean;
    isOver: boolean;
  };
};

/**
 * A pocket in the editor: a button that selects it, labelled with its number
 * and contents, plus clear and cover buttons for a filled pocket. The ring
 * marks the selected pocket, the one the next pick fills.
 */
export default function EditorPocket({
  slot,
  entry,
  selected,
  isCover,
  numbered,
  actions,
  priority,
  onSelect,
  onClear,
  onToggleCover,
  drag,
}: Props) {
  const pocket = slot + 1;
  return (
    <div
      ref={drag?.setDropRef}
      className={cn(
        "group/pocket @container relative transition-transform duration-150",
        drag?.isOver && "scale-[0.97]",
      )}
    >
      <button
        ref={drag?.setDragRef}
        type="button"
        {...drag?.attributes}
        {...drag?.listeners}
        aria-pressed={selected}
        aria-label={pocketLabel(pocket, entry, isCover)}
        onClick={onSelect}
        className={cn(
          "relative block w-full rounded-photocard transition-[box-shadow,opacity] duration-150 outline-none focus-visible:shadow-[0_0_0_2px_var(--color-foreground)]",
          selected &&
            "z-1 shadow-[0_0_0_2px_var(--color-cosmo-text),0_0_0_5px_color-mix(in_oklch,var(--color-cosmo)_25%,transparent)] focus-visible:shadow-[0_0_0_2px_var(--color-foreground),0_0_0_5px_color-mix(in_oklch,var(--color-cosmo)_25%,transparent)] md:shadow-[0_0_0_2px_var(--color-cosmo-text),0_0_0_7px_color-mix(in_oklch,var(--color-cosmo)_22%,transparent)]",
          drag?.isOver && "shadow-[0_0_0_2px_var(--color-emerald-500)]",
          drag?.isDragging && "opacity-40",
        )}
      >
        <PocketSleeve objekt={entry?.objekt} priority={priority} />
        {numbered && (
          <span className="absolute top-[4cqw] left-[4.5cqw] font-mono text-[10px] text-muted-foreground">
            {pocket}
          </span>
        )}
      </button>

      {isCover && (
        <span className="pointer-events-none absolute bottom-[4cqw] left-[4cqw] z-1 inline-flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white">
          <IconPhotoStar className="size-3" />
          {m.binder_editor_cover()}
        </span>
      )}

      {entry !== undefined && actions !== "none" && (
        <PocketActions
          pocket={pocket}
          isCover={isCover}
          onHover={actions === "hover"}
          onClear={onClear}
          onToggleCover={onToggleCover}
        />
      )}
    </div>
  );
}

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

type PocketActionsProps = {
  pocket: number;
  isCover: boolean;
  /** only show on hover or keyboard focus, as on desktop */
  onHover: boolean;
  onClear: () => void;
  onToggleCover?: () => void;
};

/**
 * The cover and clear buttons in a filled pocket's corner.
 */
function PocketActions({
  pocket,
  isCover,
  onHover,
  onClear,
  onToggleCover,
}: PocketActionsProps) {
  return (
    <div
      className={cn(
        "absolute top-[4cqw] right-[4cqw] z-2 flex gap-1",
        onHover &&
          "opacity-0 transition-opacity group-focus-within/pocket:opacity-100 group-hover/pocket:opacity-100",
      )}
    >
      {onToggleCover !== undefined && (
        <PocketAction
          label={m.binder_editor_use_as_cover()}
          pressed={isCover}
          onClick={onToggleCover}
        >
          <IconPhotoStar className="size-3.5" />
        </PocketAction>
      )}
      <PocketAction
        label={m.binder_editor_clear_pocket_n({ pocket })}
        onClick={onClear}
      >
        <IconX className="size-3.5" />
      </PocketAction>
    </div>
  );
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
