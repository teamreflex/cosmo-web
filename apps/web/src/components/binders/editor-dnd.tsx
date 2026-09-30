import type { BinderEditor } from "@/hooks/use-binder-editor";
import { m } from "@/i18n/messages";
import { pocketObjektName } from "@/lib/universal/binders";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type {
  Announcements,
  CollisionDetection,
  Data,
  DragEndEvent,
  DraggableNode,
  KeyboardCoordinateGetter,
  TouchSensorOptions,
} from "@dnd-kit/core";
import { useState } from "react";
import type { ReactNode, RefObject } from "react";
import { PocketSleeve } from "./binder-page";
import type { PickerDragData } from "./picker-grid";

// the pin grid's thresholds, so a click never turns into a drag
const DRAG_DISTANCE = 8;
// and a touch drag starts on a hold, so a swipe still scrolls
const TOUCH_DRAG_DELAY = 200;
const TOUCH_DRAG_TOLERANCE = 8;

/**
 * Touch drags only rearrange pockets. Picker cards fill a pocket with a tap,
 * so holding one never starts a drag.
 */
class PocketTouchSensor extends TouchSensor {
  static override activators = TouchSensor.activators.map(
    ({ eventName, handler }) => ({
      eventName,
      // dnd-kit also passes the draggable, which the base type leaves out
      handler: (
        event: Parameters<typeof handler>[0],
        options: TouchSensorOptions,
        context?: { active: DraggableNode },
      ) =>
        readDragData(context?.active.data.current)?.kind === "pocket" &&
        handler(event, options),
    }),
  );
}

/**
 * What a drag carries, under the `drag` key of its dnd-kit data: a card from
 * the picker, or a filled pocket.
 */
export type EditorDragData =
  | PickerDragData
  | { kind: "pocket"; slot: number; objekt: CosmoObjekt };

type Props = {
  editor: BinderEditor;
  /** the picker, which covers pockets while it's a sheet */
  pickerRef: RefObject<HTMLElement | null>;
  children: ReactNode;
};

/**
 * Drag and drop for the editor: a card dragged from the picker onto a pocket
 * fills it, and a pocket dragged onto another swaps them. Mouse and keyboard
 * drag both; touch, after a short hold, drags pockets.
 */
export default function EditorDndContext({
  editor,
  pickerRef,
  children,
}: Props) {
  const [dragging, setDragging] = useState<EditorDragData | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: DRAG_DISTANCE },
    }),
    useSensor(PocketTouchSensor, {
      activationConstraint: {
        delay: TOUCH_DRAG_DELAY,
        tolerance: TOUCH_DRAG_TOLERANCE,
      },
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

  /**
   * Mouse and touch drags land on the pocket under the pointer, but not on
   * one behind the picker sheet. Keyboard drags have no pointer, so they land
   * on the pocket nearest the dragged card.
   */
  const collisionDetection: CollisionDetection = (args) => {
    const pointer = args.pointerCoordinates;
    if (pointer === null) return closestCenter(args);
    const picker = pickerRef.current?.getBoundingClientRect();
    if (
      picker !== undefined &&
      pointer.x >= picker.left &&
      pointer.x <= picker.right &&
      pointer.y >= picker.top &&
      pointer.y <= picker.bottom
    ) {
      return [];
    }
    return pointerWithin(args);
  };

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
      {children}

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

/**
 * dnd-kit types drag data loosely, so read back the one shape the editor's
 * draggables set under `drag`.
 */
function readDragData(data: Data | undefined): EditorDragData | undefined {
  return data?.drag;
}

function readDropSlot(data: Data | undefined): number | undefined {
  return data?.slot;
}

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
