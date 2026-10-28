import { useElementSize } from "@/hooks/use-element-size";
import { MOBILE_GRID_COLUMNS } from "@/hooks/use-grid-columns";
import { useGridVirtualizer } from "@/hooks/use-grid-virtualizer";
import { UnmeasuredGridContext } from "@/hooks/use-image-loaded";
import { MOBILE_BREAKPOINT } from "@/hooks/use-media-query";
import { ObjektImageSizesContext } from "@/hooks/use-objekt-image";
import type { ObjektResponseOptions } from "@/hooks/use-objekt-response";
import { useObjektResponse } from "@/hooks/use-objekt-response";
import { tokenKey } from "@/hooks/use-objekt-selection";
import type { PinMove } from "@/hooks/use-pin-reorder";
import { m } from "@/i18n/messages";
import { lazyWithPreload } from "@/lib/lazy";
import type { ProfilePin } from "@/lib/universal/binders";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import { IconHeartBroken, IconRefresh } from "@tabler/icons-react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import type { DefaultError, QueryKey } from "@tanstack/react-query";
import { Suspense, useEffect, useMemo } from "react";
import type { ComponentType } from "react";
import { ErrorBoundary } from "react-error-boundary";
import BinderCover from "../binders/binder-cover";
import BinderPinOverlay from "../binders/binder-pin-toggle";
import BinderViewerLink from "../binders/binder-viewer-link";
import { LegacyOverlay } from "../collection/data-sources/common-legacy";
import { InfiniteQueryNext } from "../infinite-query-pending";
import Portal from "../portal";
import { Button } from "../ui/button";
import ExpandableObjekt from "./objekt-expandable";
import ObjektGridSkeleton from "./objekt-grid-skeleton";
import type { PinReorderSlot } from "./pin-reorder";

const PinReorder = lazyWithPreload(() => import("./pin-reorder"));

// gap in pixels between grid cells, both horizontally and vertically
const GAP = 16;
// horizontal breathing room so card outlines aren't clipped at the grid edges
const SIDE = 2;
const ASPECT_RATIO = 8.5 / 5.5;
// rows rendered as a plain CSS grid before the grid is measured, which includes the server render
const UNMEASURED_ROWS = 3;
// how far outside the pin block its reorder outline sits, and its corner radius
const OUTLINE_PAD = 8;
const OUTLINE_RADIUS = 16;
export type ObjektRowItem<T> =
  | {
      type: "pin";
      item: ProfilePin;
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
  TItemProps extends object = Record<string, never>,
  TError = DefaultError,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = number,
> = {
  // data
  options: ObjektResponseOptions<
    TResponse,
    TItem,
    TError,
    TQueryKey,
    TPageParam
  >;
  pins?: ProfilePin[];
  hidePins?: boolean;
  onReorderPins?: (move: PinMove) => void;
  shouldRender?: (objekt: TItem) => boolean;
  showTotal?: boolean;

  // rendering
  ItemComponent: ComponentType<BaseItemComponentProps<TItem> & TItemProps>;
  itemComponentProps?: TItemProps;
  gridColumns: number;
  getObjektId: (objekt: TItem) => string;
  authenticated: boolean;
};

export default function VirtualizedObjektGrid<
  TResponse,
  TItem,
  TItemProps extends object = Record<string, never>,
  TError = DefaultError,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = number,
>(props: Props<TResponse, TItem, TItemProps, TError, TQueryKey, TPageParam>) {
  /**
   * A grid its viewer can reorder suspends on `PinReorder` as well as its query, so start dnd-kit's download
   * beside the query rather than after it.
   */
  if (props.onReorderPins !== undefined && props.authenticated) {
    PinReorder.preload();
  }

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
  TItemProps extends object = Record<string, never>,
  TError = DefaultError,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = number,
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
}: Props<TResponse, TItem, TItemProps, TError, TQueryKey, TPageParam>) {
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
  // rounded so it stays exact as the virtualizer accumulates it down the list
  const itemHeight = Math.round(laneWidth * ASPECT_RATIO);

  const {
    items: virtualList,
    totalSize,
    scrollMargin,
    measureElement,
    measure,
  } = useGridVirtualizer({
    count: cells.length,
    lanes: gridColumns,
    gap: GAP,
    itemHeight,
    container: containerRef,
  });

  // re-measure cell sizes upon viewport size change
  useEffect(() => {
    measure();
  }, [itemHeight, measure]);

  /**
   * Drag-and-drop pin reordering. `reorderable` is stable for a mounted grid
   * (own-profile + handler provided), so the DnD providers never mount/unmount
   * and the non-pin item cells are never forced to remount when filters toggle.
   * `sortable` additionally requires visible pins to actually drag. dnd-kit
   * loads with `PinReorder` only for a grid its viewer can reorder, which
   * shows the grid skeleton until both it and the query are ready.
   */
  const reorderable = onReorderPins !== undefined && authenticated;
  const sortable = reorderable && !hidePins && pins.length > 1;

  /**
   * Until the cell size is known the estimated row height is ~0, so the
   * virtualizer would mount every cell at once. The first rows lay out as a
   * CSS grid instead, which is also what the server renders, so their images
   * load before hydration. Cells keep their keys when the virtualizer takes
   * over, so their images aren't re-created.
   */
  const measured = laneWidth > 0;
  const placed: PlacedCell[] = measured
    ? virtualList.map((virtualItem) => ({
        index: virtualItem.index,
        position: {
          top: virtualItem.start - scrollMargin,
          left: SIDE + virtualItem.lane * (laneWidth + GAP),
        },
      }))
    : cells
        .slice(0, gridColumns * UNMEASURED_ROWS)
        .map((_, index) => ({ index, position: null }));

  const renderGridBody = (slot: PinReorderSlot | null) => (
    <div
      style={
        measured
          ? { height: `${totalSize}px` }
          : { "--grid-columns": gridColumns }
      }
      className={cn(
        "w-full",
        measured
          ? "relative"
          : // gap and padding match GAP and SIDE
            "grid grid-cols-3 gap-4 px-0.5 md:grid-cols-[repeat(var(--grid-columns),minmax(0,1fr))]",
      )}
    >
      {placed.map(({ index, position }) => {
        const cell = cells[index];
        if (!cell) return null;

        const virtualized =
          position === null
            ? {}
            : {
                "data-index": index,
                ref: measureElement,
                style: {
                  transform: `translateY(${position.top}px)`,
                  left: `${position.left}px`,
                  width: `${laneWidth}px`,
                },
                className: "absolute top-0",
              };

        // render pin
        if (cell.type === "pin") {
          // sortable pins position via `top` so dnd-kit owns `transform`
          if (slot !== null && position !== null) {
            return (
              <slot.SortablePinCell
                key={`pin-${cell.item.pinId}`}
                pin={cell.item}
                index={index}
                top={position.top}
                left={position.left}
                width={laneWidth}
                measureElement={measureElement}
              >
                <PinCard pin={cell.item} authenticated={authenticated} />
              </slot.SortablePinCell>
            );
          }

          return (
            <div key={`pin-${cell.item.pinId}`} {...virtualized}>
              <PinCard pin={cell.item} authenticated={authenticated} link />
            </div>
          );
        }

        // render non-pin items
        const id = getObjektId(cell.item);
        // SAFETY: base props plus itemComponentProps satisfy TItemProps
        const itemProps = {
          item: cell.item,
          id,
          isPin: false,
          priority: index < gridColumns,
          ...itemComponentProps,
        } as BaseItemComponentProps<TItem> & TItemProps;

        return (
          <div key={id} {...virtualized}>
            <ItemComponent {...itemProps} />
          </div>
        );
      })}

      {slot !== null && measured && (
        <PinBlockOutline
          visible={slot.activePin !== null}
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
        <ObjektImageSizesContext value={cellImageSizes(gridColumns)}>
          <UnmeasuredGridContext value={!measured}>
            {reorderable ? (
              <PinReorder
                pins={pins}
                sortable={sortable}
                onReorderPins={onReorderPins}
                renderOverlay={(pin) => (
                  <PinCard pin={pin} authenticated={authenticated} eager />
                )}
              >
                {renderGridBody}
              </PinReorder>
            ) : (
              renderGridBody(null)
            )}
          </UnmeasuredGridContext>
        </ObjektImageSizesContext>
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
          isFetchNextPageError={query.isFetchNextPageError}
          fetchNextPage={query.fetchNextPage}
        />
      </Portal>
    </>
  );
}

type PlacedCell = {
  index: number;
  /** offset inside the grid body once measured, null while it's a CSS grid */
  position: { top: number; left: number } | null;
};

/**
 * Width of a `container` from each viewport width up: Tailwind caps it at
 * every breakpoint, and layout.css caps the widest at 1400px.
 */
const CONTAINER_WIDTHS = [
  { from: 0, width: "100vw" },
  { from: 640, width: "640px" },
  { from: 768, width: "768px" },
  { from: 1024, width: "1024px" },
  { from: 1280, width: "1280px" },
  { from: 1536, width: "1400px" },
];

/**
 * `sizes` for a cell's image from the column count alone, so it's the same
 * before and after the grid is measured and the browser never swaps
 * renditions. Assumes the grid fills a `container`, which has 1rem padding
 * either side.
 */
function cellImageSizes(gridColumns: number) {
  return CONTAINER_WIDTHS.map(({ from, width }, i) => {
    const columns =
      from < MOBILE_BREAKPOINT ? MOBILE_GRID_COLUMNS : gridColumns;
    const cell = `calc((${width} - 2rem - ${SIDE * 2 + GAP * (columns - 1)}px) / ${columns})`;
    const next = CONTAINER_WIDTHS[i + 1];
    return next === undefined
      ? cell
      : `(max-width: ${next.from - 1}px) ${cell}`;
  }).join(", ");
}

type PinCardProps = {
  pin: ProfilePin;
  authenticated: boolean;
  eager?: boolean;
  /** open a binder through a link of its own, where the cell itself doesn't */
  link?: boolean;
};

/**
 * What a pin cell shows. Shared by the static pin cell, the sortable pin cell,
 * and the drag overlay preview.
 */
function PinCard({
  pin,
  authenticated,
  eager = false,
  link = false,
}: PinCardProps) {
  if (pin.kind === "objekt") {
    return (
      <PinObjektCard
        objekt={pin.objekt}
        authenticated={authenticated}
        eager={eager}
      />
    );
  }

  const cover = <BinderCover binder={pin.binder} pinned />;

  // the cover and its overlay lift together, as an objekt card does
  return (
    <div className="@container relative transition-transform duration-200 ease-out select-none [-webkit-touch-callout:none] hover:-translate-y-0.5">
      {link ? (
        <BinderViewerLink binder={pin.binder}>{cover}</BinderViewerLink>
      ) : (
        cover
      )}
      <BinderPinOverlay binder={pin.binder} isOwner={authenticated} />
    </div>
  );
}

/**
 * Front image + legacy overlay for a pinned objekt.
 */
function PinObjektCard({
  objekt,
  authenticated,
  eager,
}: {
  objekt: CosmoObjekt;
  authenticated: boolean;
  eager: boolean;
}) {
  const legacyObjekt = Objekt.fromLegacy(objekt);
  return (
    <ExpandableObjekt
      collection={legacyObjekt.collection}
      selectionKey={tokenKey(parseInt(objekt.tokenId))}
      priority={true}
      eager={eager}
      /**
       * suppress the iOS long-press gestures that would hijack the reorder drag:
       * - `select-none` kills the text-selection magnifier (overlay serial text)
       * - `-webkit-touch-callout` kills the image share/save menu
       */
      className="select-none [-webkit-touch-callout:none]"
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
