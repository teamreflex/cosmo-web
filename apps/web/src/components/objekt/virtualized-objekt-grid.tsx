// oxlint-disable react/react-compiler
import { useElementSize } from "@/hooks/use-element-size";
import type { ObjektResponseOptions } from "@/hooks/use-objekt-response";
import { useObjektResponse } from "@/hooks/use-objekt-response";
import { tokenKey } from "@/hooks/use-objekt-selection";
import { m } from "@/i18n/messages";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  closestCenter,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type {
  Announcements,
  DragEndEvent,
  DragStartEvent,
  DropAnimation,
  ScreenReaderInstructions,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconHeartBroken, IconRefresh } from "@tabler/icons-react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import type { DefaultError, QueryKey } from "@tanstack/react-query";
import type { Virtualizer } from "@tanstack/react-virtual";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { LegacyOverlay } from "../collection/data-sources/common-legacy";
import { InfiniteQueryNext } from "../infinite-query-pending";
import Portal from "../portal";
import { Button } from "../ui/button";
import ExpandableObjekt from "./objekt-expandable";
import ObjektGridSkeleton from "./objekt-grid-skeleton";

// gap in pixels between grid cells, both horizontally and vertically
const GAP = 16;
// horizontal breathing room so card outlines aren't clipped at the grid edges
const SIDE = 2;
const ASPECT_RATIO = 8.5 / 5.5;
// how far outside the pin block its reorder outline sits, and its corner radius
const OUTLINE_PAD = 8;
const OUTLINE_RADIUS = 16;

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

export type ObjektRowItem<T> =
  | {
      type: "pin";
      item: CosmoObjekt;
    }
  | {
      type: "item";
      item: T;
    };

type BaseItemComponentProps<TItem> = {
  item: TItem;
  id: string;
  isPin: boolean;
  priority: boolean;
};

type Props<
  TResponse,
  TItem,
  TItemProps extends Record<string, unknown> = Record<string, never>,
  TError = DefaultError,
  TQueryKey extends QueryKey = QueryKey,
> = {
  // data
  options: ObjektResponseOptions<TResponse, TItem, TError, TQueryKey>;
  pins?: CosmoObjekt[];
  hidePins?: boolean;
  onReorderPins?: (orderedTokenIds: number[]) => void;
  shouldRender?: (objekt: TItem) => boolean;
  showTotal?: boolean;

  // rendering
  ItemComponent: ComponentType<BaseItemComponentProps<TItem> & TItemProps>;
  itemComponentProps?: TItemProps;
  gridColumns: number;
  getObjektId: (objekt: TItem) => string;
  authenticated: boolean;
  extraRowHeight?: number;
};

export default function VirtualizedObjektGrid<
  TResponse,
  TItem,
  TItemProps extends Record<string, unknown> = Record<string, never>,
  TError = DefaultError,
  TQueryKey extends QueryKey = QueryKey,
>(props: Props<TResponse, TItem, TItemProps, TError, TQueryKey>) {
  return (
    <div className="flex w-full flex-col items-center">
      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary onReset={reset} FallbackComponent={ObjektGridError}>
            <Suspense
              fallback={<ObjektGridSkeleton gridColumns={props.gridColumns} />}
            >
              <ObjektGrid {...props} />
            </Suspense>
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>

      <div id="pagination" />
    </div>
  );
}

function ObjektGrid<
  TResponse,
  TItem,
  TItemProps extends Record<string, unknown> = Record<string, never>,
  TError = DefaultError,
  TQueryKey extends QueryKey = QueryKey,
>({
  // data
  options,
  pins = [],
  hidePins = true,
  onReorderPins,
  shouldRender = () => true,
  showTotal = false,

  // rendering
  ItemComponent,
  itemComponentProps,
  gridColumns,
  getObjektId,
  authenticated,
  extraRowHeight = 0,
}: Props<TResponse, TItem, TItemProps, TError, TQueryKey>) {
  const { query, total, items } = useObjektResponse(options);
  const cells = useMemo<ObjektRowItem<TItem>[]>(() => {
    return [
      ...(hidePins
        ? []
        : pins.map((pin) => ({
            type: "pin" as const,
            item: pin,
          }))),
      ...items.filter(shouldRender).map((item) => ({
        type: "item" as const,
        item,
      })),
    ];
  }, [items, pins, shouldRender, hidePins]);

  const [containerRef, { width }] = useElementSize({ axis: "width" });

  // each cell occupies one lane; the grid is laid out per-objekt rather than
  // per-row so the virtualizer manages every objekt as an individual item.
  const laneWidth = Math.max(
    0,
    (width - SIDE * 2 - GAP * (gridColumns - 1)) / gridColumns,
  );
  const itemHeight = laneWidth * ASPECT_RATIO + extraRowHeight;

  const virtualizer = useWindowVirtualizer({
    count: cells.length,
    lanes: gridColumns,
    gap: GAP,
    // overscan is counted in items, so scale it to keep ~3 rows buffered
    overscan: gridColumns * 3,
    estimateSize: () => itemHeight,
    scrollMargin: containerRef.current?.offsetTop ?? 0,
  });

  // fixes react compiler issue: https://github.com/TanStack/virtual/issues/743
  const virtualizerRef = useRef(virtualizer);
  const virtualList = virtualizerRef.current.getVirtualItems();

  /**
   * Drag-and-drop pin reordering. `reorderable` is stable for a mounted grid
   * (own-profile + handler provided), so the DnD providers never mount/unmount
   * and the non-pin item cells are never forced to remount when filters toggle.
   * `sortable` additionally requires visible pins to actually drag.
   */
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const [activePin, setActivePin] = useState<CosmoObjekt | null>(null);

  const reorderable = onReorderPins !== undefined && authenticated;
  const sortable = reorderable && !hidePins && pins.length > 1;
  const pinIds = useMemo(
    () => (sortable ? pins.map((pin) => pin.tokenId) : []),
    [pins, sortable],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setActivePin(pins.find((pin) => pin.tokenId === event.active.id) ?? null);
    },
    [pins],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActivePin(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = pinIds.indexOf(String(active.id));
      const newIndex = pinIds.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;
      onReorderPins?.(arrayMove(pinIds, oldIndex, newIndex).map(Number));
    },
    [pinIds, onReorderPins],
  );

  const handleDragCancel = useCallback(() => setActivePin(null), []);

  const announcements = useMemo<Announcements>(
    () => ({
      onDragStart: ({ active }) =>
        m.pin_reorder_picked_up({
          position: pinIds.indexOf(String(active.id)) + 1,
          total: pinIds.length,
        }),
      onDragOver: ({ over }) =>
        over
          ? m.pin_reorder_over({
              position: pinIds.indexOf(String(over.id)) + 1,
              total: pinIds.length,
            })
          : undefined,
      onDragEnd: ({ over }) =>
        over
          ? m.pin_reorder_dropped({
              position: pinIds.indexOf(String(over.id)) + 1,
              total: pinIds.length,
            })
          : undefined,
      onDragCancel: () => m.pin_reorder_cancelled(),
    }),
    [pinIds],
  );

  const screenReaderInstructions = useMemo<ScreenReaderInstructions>(
    () => ({ draggable: m.pin_reorder_instructions() }),
    [],
  );

  const gridBody = (
    <div
      className="relative w-full will-change-transform"
      style={{
        height: `${virtualizerRef.current.getTotalSize()}px`,
      }}
    >
      {/* wait for measurement: until the cell size is known the estimated
          row height is ~0, so the virtualizer would mount every cell at
          once instead of windowing */}
      {laneWidth > 0 &&
        virtualList.map((virtualItem) => {
          const cell = cells[virtualItem.index];
          if (!cell) return null;

          const baseY =
            virtualItem.start - virtualizerRef.current.options.scrollMargin;
          const left = SIDE + virtualItem.lane * (laneWidth + GAP);
          const style = {
            transform: `translateY(${baseY}px)`,
            left: `${left}px`,
            width: `${laneWidth}px`,
          };

          // render pin
          if (cell.type === "pin") {
            // sortable pins position via `top` so dnd-kit owns `transform`
            if (sortable) {
              return (
                <SortablePinCell
                  key={cell.item.tokenId}
                  pin={cell.item}
                  index={virtualItem.index}
                  top={baseY}
                  left={left}
                  width={laneWidth}
                  authenticated={authenticated}
                  measureElement={virtualizerRef.current.measureElement}
                />
              );
            }

            return (
              <div
                key={cell.item.tokenId}
                data-index={virtualItem.index}
                ref={virtualizerRef.current.measureElement}
                style={style}
                className="absolute top-0"
              >
                <PinObjektCard pin={cell.item} authenticated={authenticated} />
              </div>
            );
          }

          // render non-pin items
          const id = getObjektId(cell.item);
          const itemProps = {
            item: cell.item,
            id,
            isPin: false,
            priority: virtualItem.index < gridColumns * 4,
            ...itemComponentProps,
          } as BaseItemComponentProps<TItem> & TItemProps;

          return (
            <div
              key={id}
              data-index={virtualItem.index}
              ref={virtualizerRef.current.measureElement}
              style={style}
              className="absolute top-0"
            >
              <ItemComponent {...itemProps} />
            </div>
          );
        })}

      {sortable && laneWidth > 0 && (
        <PinBlockOutline
          visible={activePin !== null}
          pinCount={pins.length}
          gridColumns={gridColumns}
          laneWidth={laneWidth}
          itemHeight={itemHeight}
        />
      )}
    </div>
  );

  return (
    <>
      <div className="w-full py-2" ref={containerRef}>
        {reorderable ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
            accessibility={{ announcements, screenReaderInstructions }}
          >
            <SortableContext items={pinIds} strategy={rectSortingStrategy}>
              {gridBody}
            </SortableContext>
            <DragOverlay
              className="pin-drag-overlay"
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
                    <PinObjektCard
                      pin={activePin}
                      authenticated={authenticated}
                      eager
                    />
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          gridBody
        )}
      </div>

      {showTotal && (
        <Portal to={options.totalPortalTarget ?? "#objekt-total"}>
          {total}
        </Portal>
      )}

      <Portal to="#pagination">
        <InfiniteQueryNext
          status={query.status}
          hasNextPage={query.hasNextPage}
          isFetchingNextPage={query.isFetchingNextPage}
          fetchNextPage={query.fetchNextPage}
        />
      </Portal>
    </>
  );
}

/**
 * Front image + legacy overlay for a pinned objekt. Shared by the static pin
 * cell, the sortable pin cell, and the drag overlay preview.
 */
function PinObjektCard({
  pin,
  authenticated,
  eager = false,
}: {
  pin: CosmoObjekt;
  authenticated: boolean;
  eager?: boolean;
}) {
  const legacyObjekt = Objekt.fromLegacy(pin);
  return (
    <ExpandableObjekt
      collection={legacyObjekt.collection}
      selectionKey={tokenKey(parseInt(pin.tokenId))}
      priority={true}
      eager={eager}
    >
      <LegacyOverlay
        collection={legacyObjekt.collection}
        token={legacyObjekt.objekt}
        authenticated={authenticated}
        isPin={true}
      />
    </ExpandableObjekt>
  );
}

type SortablePinCellProps = {
  pin: CosmoObjekt;
  index: number;
  top: number;
  left: number;
  width: number;
  authenticated: boolean;
  measureElement: Virtualizer<Window, Element>["measureElement"];
};

/**
 * A pin cell wired into dnd-kit's sortable context. It positions its base
 * offset via `top`/`left` so `transform` stays free for the drag/sort
 * animation, and merges the sortable node ref with the virtualizer's
 * measurement ref. `touch-action: manipulation` keeps page scroll working
 * since the touch sensor long-presses rather than claiming the gesture.
 */
function SortablePinCell({
  pin,
  index,
  top,
  left,
  width,
  authenticated,
  measureElement,
}: SortablePinCellProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pin.tokenId });

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      measureElement(node);
    },
    [setNodeRef, measureElement],
  );

  return (
    <div
      ref={setRefs}
      data-index={index}
      data-pin-sortable=""
      style={{
        top: `${top}px`,
        left: `${left}px`,
        width: `${width}px`,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
        touchAction: "manipulation",
      }}
      className="absolute cursor-pointer"
      {...attributes}
      {...listeners}
    >
      <PinObjektCard pin={pin} authenticated={authenticated} />
    </div>
  );
}

type Point = { x: number; y: number };

/**
 * Single rounded outline hugging the contiguous pin block, drawn while a pin is
 * being dragged to surface the region pins reorder within. Purely decorative,
 * so it never intercepts pointer events.
 */
function PinBlockOutline({
  visible,
  pinCount,
  gridColumns,
  laneWidth,
  itemHeight,
}: {
  visible: boolean;
  pinCount: number;
  gridColumns: number;
  laneWidth: number;
  itemHeight: number;
}) {
  const path = pinBlockPath(pinCount, gridColumns, laneWidth, itemHeight);

  return (
    <svg
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-visible transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <path d={path} className="fill-none stroke-foreground" strokeWidth={2} />
    </svg>
  );
}

/**
 * Build the SVG path for the outline around the first `pinCount` cells laid out
 * row-major across `gridColumns`. A full last row yields a rectangle; a partial
 * last row notches the outline in so it only wraps the pinned cells.
 */
function pinBlockPath(
  pinCount: number,
  gridColumns: number,
  laneWidth: number,
  itemHeight: number,
): string {
  const cardHeight = laneWidth * ASPECT_RATIO;
  const rowTop = (r: number) => r * (itemHeight + GAP);
  const rowBottom = (r: number) => rowTop(r) + cardHeight;
  const colRight = (c: number) => SIDE + c * (laneWidth + GAP) + laneWidth;

  const fullRows = Math.floor(pinCount / gridColumns);
  const rem = pinCount % gridColumns;

  const xLeft = SIDE - OUTLINE_PAD;
  const yTop = -OUTLINE_PAD;

  let points: Point[];
  if (rem === 0 || fullRows === 0) {
    // a single rectangle: either exact full rows, or one partially filled row
    const lastCol = (rem === 0 ? gridColumns : rem) - 1;
    const lastRow = rem === 0 ? fullRows - 1 : 0;
    const xRight = colRight(lastCol) + OUTLINE_PAD;
    const yBottom = rowBottom(lastRow) + OUTLINE_PAD;
    points = [
      { x: xLeft, y: yTop },
      { x: xRight, y: yTop },
      { x: xRight, y: yBottom },
      { x: xLeft, y: yBottom },
    ];
  } else {
    // full rows plus a shorter last row: step in at the partial row's width
    const xRightFull = colRight(gridColumns - 1) + OUTLINE_PAD;
    const xRightPart = colRight(rem - 1) + OUTLINE_PAD;
    const yNotch = (rowBottom(fullRows - 1) + rowTop(fullRows)) / 2;
    const yBottom = rowBottom(fullRows) + OUTLINE_PAD;
    points = [
      { x: xLeft, y: yTop },
      { x: xRightFull, y: yTop },
      { x: xRightFull, y: yNotch },
      { x: xRightPart, y: yNotch },
      { x: xRightPart, y: yBottom },
      { x: xLeft, y: yBottom },
    ];
  }

  return roundedPath(points, OUTLINE_RADIUS);
}

/**
 * Trace a closed path through axis-aligned `points`, rounding each corner with
 * a quadratic curve clamped so neighbouring corners never overlap.
 */
function roundedPath(points: Point[], radius: number): string {
  const total = points.length;
  const toward = (from: Point, to: Point): Point => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    const ratio = length === 0 ? 0 : Math.min(radius, length / 2) / length;
    return { x: from.x + dx * ratio, y: from.y + dy * ratio };
  };

  const body = points
    .map((curr, i) => {
      // indices wrap within bounds; `?? curr` only discharges the optional index
      const prev = points[(i - 1 + total) % total] ?? curr;
      const next = points[(i + 1) % total] ?? curr;
      const enter = toward(curr, prev);
      const leave = toward(curr, next);
      return `${i === 0 ? "M" : "L"} ${enter.x} ${enter.y} Q ${curr.x} ${curr.y} ${leave.x} ${leave.y}`;
    })
    .join(" ");
  return `${body} Z`;
}

function ObjektGridError(props: { resetErrorBoundary: () => void }) {
  return (
    <div className="flex w-full flex-col items-center gap-2 py-12">
      <div className="flex items-center gap-2">
        <IconHeartBroken className="h-6 w-6" />
        <p className="text-sm font-semibold">{m.error_loading_objekts()}</p>
      </div>
      <Button variant="outline" onClick={props.resetErrorBoundary}>
        <IconRefresh className="mr-2" /> {m.common_retry()}
      </Button>
    </div>
  );
}
