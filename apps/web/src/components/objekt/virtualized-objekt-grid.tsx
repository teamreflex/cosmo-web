// oxlint-disable react/react-compiler
import { useElementSize } from "@/hooks/use-element-size";
import type { ObjektResponseOptions } from "@/hooks/use-objekt-response";
import { useObjektResponse } from "@/hooks/use-objekt-response";
import { tokenKey } from "@/hooks/use-objekt-selection";
import { m } from "@/i18n/messages";
import { Objekt } from "@/lib/universal/objekt-conversion";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type {
  Announcements,
  DragEndEvent,
  DragStartEvent,
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
            <DragOverlay className="pin-drag-overlay">
              {activePin ? (
                <PinObjektCard
                  pin={activePin}
                  authenticated={authenticated}
                  eager
                />
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
