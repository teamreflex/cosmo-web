import { useMemo, useRef } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import Portal from "../portal";
import { InfiniteQueryNext } from "../infinite-query-pending";
import { LegacyOverlay } from "../collection/data-sources/common-legacy";
import ExpandableObjekt from "./objekt-expandable";
import type { ComponentType } from "react";
import type { DefaultError, QueryKey } from "@tanstack/react-query";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import type { ObjektResponseOptions } from "@/hooks/use-objekt-response";
import { useObjektResponse } from "@/hooks/use-objekt-response";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { useElementSize } from "@/hooks/use-element-size";

const GAP = 16;
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
};

export default function VirtualizedObjektGrid<
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
}: Props<TResponse, TItem, TItemProps, TError, TQueryKey>) {
  const { query, total, items } = useObjektResponse(options);
  const rows = useMemo(() => {
    const initialItems = [
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

    const result: ObjektRowItem<TItem>[][] = [];
    for (let i = 0; i < initialItems.length; i += gridColumns) {
      result.push(initialItems.slice(i, i + gridColumns));
    }
    return result;
  }, [items, pins, shouldRender, gridColumns, hidePins]);

  const [containerRef, { width }] = useElementSize({ axis: "width" });
  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    overscan: 3,
    estimateSize: () => {
      const itemWidth = (width - GAP * (gridColumns - 1)) / gridColumns;
      return itemWidth * ASPECT_RATIO;
    },
    scrollMargin: containerRef.current?.offsetTop ?? 0,
  });

  // fixes react compiler issue: https://github.com/TanStack/virtual/issues/743
  const virtualizerRef = useRef(virtualizer);
  const virtualList = virtualizerRef.current.getVirtualItems();

  return (
    <>
      <div className="w-full py-2" ref={containerRef}>
        <div
          className="relative flex flex-col will-change-transform contain-paint"
          style={{
            height: `${virtualizerRef.current.getTotalSize()}px`,
          }}
        >
          {virtualList.map((rowItem) => {
            const row = rows[rowItem.index];
            if (!row) return null;

            return (
              <div
                key={rowItem.key}
                style={{
                  "--grid-columns": gridColumns,
                  transform: `translateY(${
                    rowItem.start - virtualizerRef.current.options.scrollMargin
                  }px)`,
                  // need to add padding to the top and bottom of the grid to prevent border clipping
                  // add padding to the gap in between rows, and 2px to the first row
                  paddingTop: rowItem.index === 0 ? 2 : GAP,
                  // add padding to the last row
                  paddingBottom: rowItem.index === rows.length - 1 ? 2 : 0,
                }}
                data-index={rowItem.index}
                ref={virtualizerRef.current.measureElement}
                className="absolute top-0 left-0 grid w-full grid-cols-3 gap-4 px-0.5 md:grid-cols-[repeat(var(--grid-columns),minmax(0,1fr))]"
              >
                {row.map((objekt, index) => {
                  // render pin
                  if (objekt.type === "pin") {
                    const legacyObjekt = Objekt.fromLegacy(objekt.item);
                    return (
                      <ExpandableObjekt
                        key={objekt.item.tokenId}
                        collection={legacyObjekt.collection}
                        tokenId={parseInt(objekt.item.tokenId)}
                        priority={true}
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

                  // render non-pin items
                  const props = {
                    item: objekt.item,
                    id: getObjektId(objekt.item),
                    isPin: false,
                    priority: index <= gridColumns * 4,
                    ...itemComponentProps,
                  } as BaseItemComponentProps<TItem> & TItemProps;

                  return (
                    <ItemComponent key={getObjektId(objekt.item)} {...props} />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {showTotal && <Portal to="#objekt-total">{total}</Portal>}
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
