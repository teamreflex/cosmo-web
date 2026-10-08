import type { BinderEditor } from "@/hooks/use-binder-editor";
import { m } from "@/i18n/messages";
import {
  DRAG_DISTANCE,
  isSideBySide,
  TOUCH_DRAG_DELAY,
  TOUCH_DRAG_TOLERANCE,
} from "@/lib/client/binder-editor";
import {
  pageDrop,
  pocketObjektName,
  pocketsByPage,
} from "@/lib/universal/binders";
import type { BinderObjekt } from "@/lib/universal/binders";
import { cn } from "@/lib/utils";
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
  ClientRect,
  CollisionDetection,
  Data,
  DragEndEvent,
  DraggableNode,
  KeyboardCoordinateGetter,
  Modifier,
  TouchSensorOptions,
} from "@dnd-kit/core";
import { getEventCoordinates } from "@dnd-kit/utilities";
import type { Coordinates } from "@dnd-kit/utilities";
import { useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { PageThumbnail, PocketSleeve } from "./binder-page";
import type { PickerDragData } from "./picker-grid";

/**
 * Touch drags rearrange pockets, and pages too where the page strip sits
 * beside the picker. A phone's strip scrolls under a finger instead, and
 * Arrange pages reorders there. Picker cards fill a pocket with a tap, so
 * holding one never starts a drag.
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
      ) => {
        const kind = readDragData(context?.active.data.current)?.kind;
        return (
          (kind === "pocket" || (kind === "page" && isSideBySide())) &&
          handler(event, options)
        );
      },
    }),
  );
}

/**
 * What a drag carries, under the `drag` key of its dnd-kit data: a card from
 * the picker, a filled pocket, or a page thumbnail from the strip.
 */
export type EditorDragData =
  | PickerDragData
  | { kind: "pocket"; slot: number; objekt: BinderObjekt }
  | { kind: "page"; page: number };

type Props = {
  editor: BinderEditor;
  /** the picker, which covers pockets while it's a sheet */
  pickerRef: RefObject<HTMLElement | null>;
  /** the page strip, which scrolls its thumbnails out of view */
  stripRef: RefObject<HTMLElement | null>;
  children: ReactNode;
};

/**
 * Drag and drop for the editor: a card dragged from the picker onto a pocket
 * fills it, and a pocket dragged onto another swaps them. Either dropped on a
 * page thumbnail goes into that page's first empty pocket, and a thumbnail
 * dragged along the strip moves its page. Mouse and keyboard drag all of
 * them; touch, after a short hold, drags pockets, and pages beside the picker.
 */
export default function EditorDndContext({
  editor,
  pickerRef,
  stripRef,
  children,
}: Props) {
  const [dragging, setDragging] = useState<EditorDragData | null>(null);
  // a pocket or card over a page thumbnail shrinks, so the thumbnail shows
  const [overPage, setOverPage] = useState(false);
  // a drag starts over its own spot, which would talk over "picked up"
  const startingOver = useRef(false);

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
      // Enter stays free to select a pocket, pick a card or go to a page
      keyboardCodes: {
        start: ["Space"],
        end: ["Space", "Enter"],
        cancel: ["Escape"],
      },
      coordinateGetter: (event, args) =>
        editorKeyboardCoordinates(event, args, (point) => {
          const picker = pickerRef.current?.getBoundingClientRect();
          // an open sheet hides everything below its top edge, scrolled into view or not
          return (
            picker !== undefined &&
            picker.top < window.innerHeight &&
            point.x >= picker.left &&
            point.x <= picker.right &&
            point.y >= picker.top
          );
        }),
    }),
  );

  /**
   * A page lands on the thumbnail nearest it, so the strip reorders wherever
   * along it the pointer is. Mouse and touch drags of pockets and cards land
   * on the pocket or thumbnail under the pointer, but not on one behind the
   * picker sheet or scrolled out of the strip. Keyboard drags have no
   * pointer, so they land on the pocket or thumbnail nearest the dragged card.
   */
  const collisionDetection: CollisionDetection = (args) => {
    const pages = readDragData(args.active.data.current)?.kind === "page";
    const pointer = args.pointerCoordinates;
    const strip = stripRef.current?.getBoundingClientRect();
    const reachesStrip =
      pointer === null || (strip !== undefined && contains(strip, pointer));
    const droppableContainers = args.droppableContainers.filter((container) => {
      const page = readDropPage(container.data.current) !== undefined;
      return pages ? page : !page || reachesStrip;
    });

    if (pages || pointer === null) {
      return closestCenter({ ...args, droppableContainers });
    }
    const picker = pickerRef.current?.getBoundingClientRect();
    if (picker !== undefined && contains(picker, pointer)) return [];
    return pointerWithin({ ...args, droppableContainers });
  };

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDragging(null);
    setOverPage(false);
    const drag = readDragData(active.data.current);
    if (drag === undefined || over === null) return;
    const page = readDropPage(over.data.current);
    const slot = readDropSlot(over.data.current);

    if (drag.kind === "page") {
      if (page !== undefined) editor.movePage(drag.page, page);
      return;
    }
    if (page !== undefined) {
      if (drag.kind === "pocket") editor.moveToPage(drag.slot, page);
      else editor.placeOnPage(page, drag.objekt);
      return;
    }
    if (slot === undefined) return;
    if (drag.kind === "pocket") {
      editor.swap(drag.slot, slot);
      return;
    }
    const next = editor.place(slot, drag.objekt);
    if (slot === editor.selected) editor.select(next);
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      startingOver.current = true;
      const drag = readDragData(active.data.current);
      if (drag === undefined) return undefined;
      return drag.kind === "page"
        ? m.binder_editor_drag_picked_up_page({ page: drag.page + 1 })
        : m.binder_editor_drag_picked_up({
            objekt: pocketObjektName(drag.objekt),
          });
    },
    onDragOver: ({ active, over }) => {
      const starting = startingOver.current;
      startingOver.current = false;
      if (starting && over?.id === active.id) return undefined;
      const page = readDropPage(over?.data.current);
      if (page !== undefined) {
        return m.binder_editor_drag_over_page({ page: page + 1 });
      }
      const slot = readDropSlot(over?.data.current);
      return slot === undefined
        ? undefined
        : m.binder_editor_drag_over({ pocket: slot + 1 });
    },
    onDragEnd: ({ active, over }) => {
      const drag = readDragData(active.data.current);
      const page = readDropPage(over?.data.current);
      const slot = readDropSlot(over?.data.current);
      if (drag?.kind === "page") {
        return page === undefined || page === drag.page
          ? m.binder_editor_drag_cancelled()
          : m.binder_editor_drag_moved_page({
              from: drag.page + 1,
              to: page + 1,
            });
      }
      if (drag === undefined) return m.binder_editor_drag_cancelled();
      if (page !== undefined) {
        // a full page says so in a toast
        return pageDrop(editor.binder, page, drag.objekt.tokenId).kind ===
          "pocket"
          ? m.binder_editor_drag_dropped_on_page({
              objekt: pocketObjektName(drag.objekt),
              page: page + 1,
            })
          : m.binder_editor_drag_cancelled();
      }
      return slot === undefined ||
        (drag.kind === "pocket" && slot === drag.slot)
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
      // the picker scrolls on its own; the window and the page strip follow a drag
      autoScroll={{
        canScroll: (element) =>
          element === document.scrollingElement || element === stripRef.current,
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
      onDragOver={({ over }) =>
        setOverPage(readDropPage(over?.data.current) !== undefined)
      }
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setDragging(null);
        setOverPage(false);
      }}
    >
      {children}

      <DragOverlay
        dropAnimation={null}
        modifiers={[liftOverPage]}
        className="cursor-grabbing"
      >
        {dragging !== null && (
          <div
            className={cn(
              "drop-shadow-xl transition-[scale] duration-150",
              overPage && dragging.kind !== "page" && "scale-40",
            )}
          >
            <div className="animate-pin-pickup">
              {dragging.kind === "page" ? (
                <PageThumbnail
                  layout={editor.binder.layout}
                  pockets={pocketsByPage(editor.binder.entries).get(
                    dragging.page,
                  )}
                  className="bg-background"
                />
              ) : (
                <PocketSleeve objekt={dragging.objekt} priority />
              )}
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

function readDropPage(data: Data | undefined): number | undefined {
  return data?.page;
}

/**
 * A pocket or card over a page thumbnail sits shrunk above the pointer, so the
 * thumbnail and its ring stay in sight. A keyboard drag has no pointer and is
 * already centred on the thumbnail, so it's only lifted.
 */
const liftOverPage: Modifier = ({
  active,
  activatorEvent,
  draggingNodeRect,
  over,
  transform,
}) => {
  if (
    draggingNodeRect === null ||
    readDropPage(over?.data.current) === undefined ||
    readDragData(active?.data.current)?.kind === "page"
  ) {
    return transform;
  }
  const pointer =
    activatorEvent === null ? null : getEventCoordinates(activatorEvent);
  const { left, top, width, height } = draggingNodeRect;
  return {
    ...transform,
    x: transform.x + (pointer === null ? 0 : pointer.x - left - width / 2),
    y:
      transform.y +
      (pointer === null ? 0 : pointer.y - top - height / 2) -
      height / 2,
  };
};

function contains(rect: ClientRect, point: Coordinates) {
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
}

const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

/**
 * Arrow keys move a keyboard drag to the nearest target in that direction,
 * centring the dragged card on it: a pocket or page thumbnail for a pocket or
 * a picker card, and another thumbnail along the strip for a page. Targets
 * behind the picker sheet are out of sight, so they're skipped.
 */
function editorKeyboardCoordinates(
  event: Parameters<KeyboardCoordinateGetter>[0],
  {
    context: { active, collisionRect, droppableRects, droppableContainers },
  }: Parameters<KeyboardCoordinateGetter>[1],
  behindPicker: (point: Coordinates) => boolean,
): ReturnType<KeyboardCoordinateGetter> {
  if (!arrowKeys.includes(event.code) || collisionRect === null) {
    return undefined;
  }
  event.preventDefault();

  const pages = readDragData(active?.data.current)?.kind === "page";
  const fromX = collisionRect.left + collisionRect.width / 2;
  const fromY = collisionRect.top + collisionRect.height / 2;
  let target:
    | { left: number; top: number; width: number; height: number }
    | undefined;
  let best = Infinity;

  for (const container of droppableContainers.getEnabled()) {
    if (pages && readDropPage(container.data.current) === undefined) continue;
    const rect = droppableRects.get(container.id);
    if (rect === undefined) continue;

    const centre = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    if (behindPicker(centre)) continue;

    const dx = centre.x - fromX;
    const dy = centre.y - fromY;
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
}
