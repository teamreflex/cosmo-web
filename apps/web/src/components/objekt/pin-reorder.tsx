import { useOpenBinder } from "@/hooks/use-open-binder";
import type { PinMove } from "@/hooks/use-pin-reorder";
import { m } from "@/i18n/messages";
import type { BinderPreview, ProfilePin } from "@/lib/universal/binders";
import {
  closestCenter,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type {
  Announcements,
  DragEndEvent,
  DragStartEvent,
  DropAnimation,
  ScreenReaderInstructions,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Virtualizer } from "@tanstack/react-virtual";
import { useCallback, useMemo, useState } from "react";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";

// a pin drag activates after this hold (ms) within the movement tolerance (px)
const PIN_DRAG_DELAY = 200;
const PIN_DRAG_TOLERANCE = 8;

/**
 * Drop animation for a released pin. Position glide, untilt, and unscale all
 * ride one keyframe set on the overlay so they land together — a separate tilt
 * animation drifts out of sync with the move. Start and end always differ (the
 * rotation), so dnd-kit plays the glide even for a zero-distance drop instead of
 * snapping. The tilt/scale values mirror the `pin-pickup` keyframe's end.
 */
const pinDropAnimation: DropAnimation = {
  keyframes: ({ transform }) => [
    {
      transform: `${CSS.Transform.toString(transform.initial)} rotate(5deg) scale(1.05)`,
    },
    {
      transform: `${CSS.Transform.toString(transform.final)} rotate(0deg) scale(1)`,
    },
  ],
  sideEffects: (params) => {
    // the inner wrapper holds the drag tilt via CSS; clear it so the
    // overlay-level keyframes own the untilt rather than compounding with it
    const tilt = params.dragOverlay.node.querySelector("[data-pin-pickup]");
    if (tilt instanceof HTMLElement) {
      tilt.style.animation = "none";
      tilt.style.transform = "none";
    }
    return defaultDropAnimationSideEffects({
      styles: { active: { opacity: "0" } },
    })(params);
  },
};

/**
 * What `PinReorder` hands the grid body while its pins are sortable: the pin
 * being dragged, and the pin cell wired into the sortable context.
 */
export type PinReorderSlot = {
  activePin: ProfilePin | null;
  SortablePinCell: typeof SortablePinCell;
};

type Props = {
  pins: ProfilePin[];
  /** pins are visible and there's more than one to drag */
  sortable: boolean;
  onReorderPins: (move: PinMove) => void;
  /** the dragged pin's card in the drag overlay */
  renderOverlay: (pin: ProfilePin) => ReactNode;
  children: (slot: PinReorderSlot | null) => ReactNode;
};

/**
 * Drag-and-drop pin reordering for a grid its viewer owns. Its own chunk, so
 * dnd-kit only downloads for a grid that can be reordered.
 */
export default function PinReorder({
  pins,
  sortable,
  onReorderPins,
  renderOverlay,
  children,
}: Props) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: PIN_DRAG_DELAY,
        tolerance: PIN_DRAG_TOLERANCE,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const [activePin, setActivePin] = useState<ProfilePin | null>(null);

  const pinIds = useMemo(
    () => (sortable ? pins.map((pin) => pin.pinId) : []),
    [pins, sortable],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setActivePin(pins.find((pin) => pin.pinId === event.active.id) ?? null);
    },
    [pins],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActivePin(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      // both ids must be pins; items from the main grid aren't sortable
      if (
        !pinIds.includes(Number(active.id)) ||
        !pinIds.includes(Number(over.id))
      ) {
        return;
      }
      onReorderPins({
        pinId: Number(active.id),
        overPinId: Number(over.id),
      });
    },
    [pinIds, onReorderPins],
  );

  const handleDragCancel = useCallback(() => setActivePin(null), []);

  const announcements = useMemo<Announcements>(() => {
    const name = (id: UniqueIdentifier) => {
      const pin = pins.find((p) => p.pinId === id);
      if (pin === undefined) return "";
      return pin.kind === "objekt"
        ? pin.objekt.collectionId
        : m.pin_reorder_binder({ name: pin.binder.name });
    };
    const position = (id: UniqueIdentifier) => ({
      position: pinIds.indexOf(Number(id)) + 1,
      total: pinIds.length,
    });

    return {
      onDragStart: ({ active }) =>
        m.pin_reorder_picked_up({
          name: name(active.id),
          ...position(active.id),
        }),
      onDragOver: ({ active, over }) =>
        over
          ? m.pin_reorder_over({ name: name(active.id), ...position(over.id) })
          : undefined,
      onDragEnd: ({ active, over }) =>
        over
          ? m.pin_reorder_dropped({
              name: name(active.id),
              ...position(over.id),
            })
          : undefined,
      onDragCancel: () => m.pin_reorder_cancelled(),
    };
  }, [pins, pinIds]);

  const screenReaderInstructions = useMemo<ScreenReaderInstructions>(
    () => ({ draggable: m.pin_reorder_instructions() }),
    [],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      accessibility={{ announcements, screenReaderInstructions }}
    >
      <SortableContext items={pinIds} strategy={rectSortingStrategy}>
        {children(sortable ? { activePin, SortablePinCell } : null)}
      </SortableContext>
      <DragOverlay
        className="cursor-grabbing! **:cursor-grabbing!"
        dropAnimation={pinDropAnimation}
      >
        {activePin ? (
          /**
           * The outer wrapper stays untilted so dnd-kit measures an
           * upright box for the drop delta (a rotated box is shifted by
           * the tilt); the tilt/scale live on the inner wrapper.
           */
          <div className="drop-shadow-xl">
            <div data-pin-pickup className="animate-pin-pickup">
              {renderOverlay(activePin)}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

type SortablePinCellProps = {
  pin: ProfilePin;
  index: number;
  top: number;
  left: number;
  width: number;
  measureElement: Virtualizer<Window, Element>["measureElement"];
  /** the pin's card, the same one a static pin cell shows */
  children: ReactNode;
};

/**
 * A pin cell wired into dnd-kit's sortable context. It positions its base
 * offset via `top`/`left` so `transform` stays free for the drag/sort
 * animation, and merges the sortable node ref with the virtualizer's
 * measurement ref. `touch-action: manipulation` keeps page scroll working
 * since the touch sensor long-presses rather than claiming the gesture. A
 * binder pin opens the viewer from the cell itself, on click or Enter, since
 * a link inside would fight the drag.
 */
function SortablePinCell({
  pin,
  index,
  top,
  left,
  width,
  measureElement,
  children,
}: SortablePinCellProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pin.pinId });
  const { open, prefetch } = useOpenBinder();

  // only keys pressed on the cell itself pick it up, not on buttons inside it
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      setActivatorNodeRef(node);
      measureElement(node);
    },
    [setNodeRef, setActivatorNodeRef, measureElement],
  );

  const binder = pin.kind === "binder" ? pin.binder : undefined;

  function openBinder(target: BinderPreview, cell: HTMLDivElement) {
    // the cover lifts inside the cell on hover, so the flight starts from it
    const cover = cell.firstElementChild;
    open(target, cell, cover instanceof HTMLElement ? cover : cell);
  }

  return (
    <div
      ref={setRefs}
      data-index={index}
      style={{
        top: `${top}px`,
        left: `${left}px`,
        width: `${width}px`,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
        touchAction: "manipulation",
      }}
      className="absolute cursor-pointer rounded-photocard outline-none"
      {...attributes}
      {...listeners}
      {...(binder && {
        "aria-label": m.binder_viewer_open({ name: binder.name }),
        onClick: (event: MouseEvent<HTMLDivElement>) =>
          openBinder(binder, event.currentTarget),
        onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
          // mid keyboard drag, Enter drops the pin rather than opening it
          if (event.key === "Enter" && !isDragging) {
            event.preventDefault();
            openBinder(binder, event.currentTarget);
          } else {
            listeners?.onKeyDown?.(event);
          }
        },
        onPointerEnter: () => prefetch(binder),
        onFocus: () => prefetch(binder),
      })}
    >
      {children}
    </div>
  );
}
