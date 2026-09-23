import { Button } from "@/components/ui/button";
import type { BinderEditor } from "@/hooks/use-binder-editor";
import { m } from "@/i18n/messages";
import { binderGrid, pocketObjektName } from "@/lib/universal/binders";
import type { BinderPocketEntry } from "@/lib/universal/binders";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type {
  Announcements,
  CollisionDetection,
  Data,
  DragEndEvent,
  KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { BinderPage, PocketSleeve } from "./binder-page";
import {
  DesktopPageControls,
  DoneButton,
  EditorHints,
  EditorStatus,
  LayoutChip,
} from "./editor-controls";
import EditorPocket from "./editor-pocket";
import ObjektPicker from "./objekt-picker";
import type { PickerDragData } from "./picker-grid";

// the pin grid's threshold, so a click never turns into a drag
const DRAG_DISTANCE = 8;

type DragData =
  | PickerDragData
  | { kind: "pocket"; slot: number; objekt: CosmoObjekt };

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
 * The desktop editor: the page on the left with numbered pockets, the picker
 * filling the right column at the page's height. Click a pocket then a card
 * to fill it; dragging a card onto a pocket, or a pocket onto another, is a
 * mouse and keyboard shortcut.
 */
export default function BinderEditorDesktop({
  editor,
  username,
  address,
  lockedTokenIds,
  onEdit,
  onDelete,
  onRemoveLastPage,
}: Props) {
  const { binder } = editor;
  const { columns, rows, pocketsPerPage } = binderGrid(binder.layout);
  const [dragging, setDragging] = useState<DragData | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: DRAG_DISTANCE },
    }),
    useSensor(KeyboardSensor, {
      // Enter stays free to select a pocket or pick a card
      keyboardCodes: {
        start: ["Space"],
        end: ["Space", "Enter"],
        cancel: ["Escape"],
      },
      coordinateGetter: pocketKeyboardCoordinates,
    }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDragging(null);
    const drag = readDragData(active.data.current);
    const slot = readDropSlot(over?.data.current);
    if (drag === undefined || slot === undefined) return;

    if (drag.kind === "pocket") {
      editor.swap(drag.slot, slot);
      return;
    }
    const next = editor.place(slot, drag.objekt);
    if (slot === editor.selected) editor.select(next);
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      const drag = readDragData(active.data.current);
      return drag === undefined
        ? undefined
        : m.binder_editor_drag_picked_up({
            objekt: pocketObjektName(drag.objekt),
          });
    },
    onDragOver: ({ over }) => {
      const slot = readDropSlot(over?.data.current);
      return slot === undefined
        ? undefined
        : m.binder_editor_drag_over({ pocket: slot + 1 });
    },
    onDragEnd: ({ active, over }) => {
      const drag = readDragData(active.data.current);
      const slot = readDropSlot(over?.data.current);
      return drag === undefined || slot === undefined
        ? m.binder_editor_drag_cancelled()
        : m.binder_editor_drag_dropped({
            objekt: pocketObjektName(drag.objekt),
            pocket: slot + 1,
          });
    },
    onDragCancel: () => m.binder_editor_drag_cancelled(),
  };

  return (
    <DndContext
      // a fixed id keeps dnd-kit's generated aria ids the same on the server
      id="binder-editor"
      sensors={sensors}
      collisionDetection={collisionDetection}
      // the picker scrolls on its own; only the window follows a drag
      autoScroll={{
        canScroll: (element) => element === document.scrollingElement,
      }}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: m.binder_editor_drag_instructions(),
        },
      }}
      onDragStart={({ active }) =>
        setDragging(readDragData(active.data.current) ?? null)
      }
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(260px,340px)] overflow-hidden rounded-xl border border-border xl:grid-cols-[minmax(0,1fr)_minmax(300px,440px)]">
        <div className="flex min-w-0 flex-col gap-2.5 border-r border-border p-4.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-2">
            <span
              aria-hidden
              style={{ backgroundColor: binder.colour }}
              className="size-3.5 shrink-0 rounded-full ring-1 ring-white/15"
            />
            <h1 className="min-w-0 truncate font-cosmo text-base font-black uppercase">
              {binder.name}
            </h1>
            <LayoutChip editor={editor} />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={m.binder_editor_edit()}
              title={m.binder_editor_edit()}
              onClick={onEdit}
            >
              <IconPencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={m.binder_editor_delete()}
              title={m.binder_editor_delete()}
              onClick={onDelete}
              className="text-muted-foreground hover:text-destructive"
            >
              <IconTrash />
            </Button>
            <span className="flex-1" />
            <EditorStatus saving={editor.saving} />
            <DoneButton username={username} slug={binder.slug} />
          </div>

          <BinderPage
            layout={binder.layout}
            className="mx-auto w-full"
            // sized so the whole page fits under the navbar with its controls
            style={{
              maxWidth: `calc(max(30rem, 100dvh - 19rem) * ${(columns * 5.5) / (rows * 8.5)})`,
            }}
          >
            {Array.from({ length: pocketsPerPage }, (_, slot) => (
              <DesktopPocket
                key={slot}
                slot={slot}
                entry={editor.pockets.get(slot)}
                editor={editor}
              />
            ))}
          </BinderPage>

          <DesktopPageControls
            editor={editor}
            onRemoveLastPage={onRemoveLastPage}
          />
          <EditorHints />
        </div>

        <div className="relative min-h-120 bg-muted/30">
          <ObjektPicker
            address={address}
            lockedTokenIds={lockedTokenIds}
            inBinderTokenIds={editor.inBinderTokenIds}
            suggestion={editor.suggestion}
            draggable
            onPick={(objekt) => editor.pick(objekt)}
            className="absolute inset-0"
          />
        </div>
      </div>

      <DragOverlay dropAnimation={null} className="cursor-grabbing">
        {dragging !== null && (
          <div className="drop-shadow-xl">
            <div className="animate-pin-pickup">
              <PocketSleeve objekt={dragging.objekt} priority />
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

type DesktopPocketProps = {
  slot: number;
  entry: BinderPocketEntry | undefined;
  editor: BinderEditor;
};

/**
 * A pocket that takes drops from the picker and other pockets, and can be
 * dragged itself once it holds an objekt.
 */
function DesktopPocket({ slot, entry, editor }: DesktopPocketProps) {
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
          : ({ kind: "pocket", slot, objekt: entry.objekt } satisfies DragData),
    },
  });
  const tokenId = entry === undefined ? null : Number(entry.objekt.tokenId);
  const isCover = tokenId !== null && tokenId === editor.binder.coverTokenId;

  return (
    <EditorPocket
      slot={slot}
      entry={entry}
      selected={editor.selected === slot}
      isCover={isCover}
      numbered
      actions="hover"
      priority
      onSelect={() => editor.select(slot)}
      onClear={() => editor.clear(slot)}
      onToggleCover={() => editor.setCover(isCover ? null : tokenId)}
      drag={{
        setDropRef,
        setDragRef,
        // an empty pocket isn't draggable, so it keeps its plain button semantics
        attributes: entry === undefined ? undefined : attributes,
        listeners,
        isDragging,
        isOver,
      }}
    />
  );
}

/**
 * dnd-kit types drag data loosely, so read back the one shape the editor's
 * draggables set under `drag`.
 */
function readDragData(data: Data | undefined): DragData | undefined {
  return data?.drag;
}

function readDropSlot(data: Data | undefined): number | undefined {
  return data?.slot;
}

/**
 * Mouse drags land on the pocket under the pointer. Keyboard drags have no
 * pointer, so they land on the pocket nearest the dragged card.
 */
const collisionDetection: CollisionDetection = (args) =>
  args.pointerCoordinates === null ? closestCenter(args) : pointerWithin(args);

const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

/**
 * Arrow keys move a keyboard drag to the nearest pocket in that direction,
 * from a pocket or from a picker card, centring the card on it.
 */
const pocketKeyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  { context: { collisionRect, droppableRects, droppableContainers } },
) => {
  if (!arrowKeys.includes(event.code) || collisionRect === null) {
    return undefined;
  }
  event.preventDefault();

  const fromX = collisionRect.left + collisionRect.width / 2;
  const fromY = collisionRect.top + collisionRect.height / 2;
  let target:
    | { left: number; top: number; width: number; height: number }
    | undefined;
  let best = Infinity;

  for (const container of droppableContainers.getEnabled()) {
    const rect = droppableRects.get(container.id);
    if (rect === undefined) continue;

    const dx = rect.left + rect.width / 2 - fromX;
    const dy = rect.top + rect.height / 2 - fromY;
    // distance along the arrow, with sideways drift weighted against
    const [along, across] =
      event.code === "ArrowLeft" || event.code === "ArrowRight"
        ? [event.code === "ArrowRight" ? dx : -dx, dy]
        : [event.code === "ArrowDown" ? dy : -dy, dx];
    if (along < 1) continue;

    const distance = along + 2 * Math.abs(across);
    if (distance < best) {
      best = distance;
      target = rect;
    }
  }

  return target === undefined
    ? undefined
    : {
        x: target.left + (target.width - collisionRect.width) / 2,
        y: target.top + (target.height - collisionRect.height) / 2,
      };
};
