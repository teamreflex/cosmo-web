// oxlint-disable react/react-compiler
import { useElementSize } from "@/hooks/use-element-size";
import type { ObjektResponseOptions } from "@/hooks/use-objekt-response";
import { useObjektResponse } from "@/hooks/use-objekt-response";
import { tokenKey } from "@/hooks/use-objekt-selection";
import { m } from "@/i18n/messages";
import { Objekt } from "@/lib/universal/objekt-conversion";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import { IconHeartBroken, IconRefresh } from "@tabler/icons-react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import type { DefaultError, QueryKey } from "@tanstack/react-query";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Suspense, useMemo, useRef } from "react";
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

  return (
    <>
      <div className="w-full py-2" ref={containerRef}>
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

              const style = {
                transform: `translateY(${
                  virtualItem.start -
                  virtualizerRef.current.options.scrollMargin
                }px)`,
                left: `${SIDE + virtualItem.lane * (laneWidth + GAP)}px`,
                width: `${laneWidth}px`,
              };

              // render pin
              if (cell.type === "pin") {
                const legacyObjekt = Objekt.fromLegacy(cell.item);
                return (
                  <div
                    key={cell.item.tokenId}
                    data-index={virtualItem.index}
                    ref={virtualizerRef.current.measureElement}
                    style={style}
                    className="absolute top-0"
                  >
                    <ExpandableObjekt
                      collection={legacyObjekt.collection}
                      selectionKey={tokenKey(parseInt(cell.item.tokenId))}
                      priority={true}
                    >
                      <LegacyOverlay
                        collection={legacyObjekt.collection}
                        token={legacyObjekt.objekt}
                        authenticated={authenticated}
                        isPin={true}
                      />
                    </ExpandableObjekt>
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
