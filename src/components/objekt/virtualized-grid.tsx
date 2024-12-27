/* eslint-disable react-compiler/react-compiler */
import { useProfileContext } from "@/hooks/use-profile";
import { Props } from "./filtered-objekt-display";
import { useObjektRewards } from "@/hooks/use-objekt-rewards";
import { useObjektResponse } from "@/hooks/use-objekt-response";
import { useElementSize } from "@/hooks/use-element-size";
import { cloneElement, CSSProperties, useMemo } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { CosmoObjekt } from "@/lib/universal/cosmo/objekts";
import Portal from "../portal";
import { Objekt } from "@/lib/universal/objekt-conversion";
import ExpandableObjekt from "./objekt-expandable";
import { LegacyOverlay } from "../collection/data-sources/common-legacy";
import { InfiniteQueryNext } from "../infinite-query-pending";

type ListItem<T> =
  | {
      type: "pin";
      item: CosmoObjekt;
    }
  | {
      type: "item";
      item: T;
    };

interface ObjektGridProps<Response, Item>
  extends Omit<Props<Response, Item>, "artists" | "gridColumns"> {
  hidePins: boolean;
  rowSize: number;
}

const GAP = 16;
const ASPECT_RATIO = 8.5 / 5.5;

export default function VirtualizedGrid<Response, Item>({
  children,
  options,
  getObjektId,
  shouldRender,
  authenticated,
  hidePins,
  rowSize,
}: ObjektGridProps<Response, Item>) {
  // data
  const pins = useProfileContext((ctx) => ctx.pins);
  const { rewardsDialog } = useObjektRewards();
  const { query, total, items } = useObjektResponse(options);

  // merge pins and items
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

    const result: ListItem<Item>[][] = [];
    for (let i = 0; i < initialItems.length; i += rowSize) {
      result.push(initialItems.slice(i, i + rowSize));
    }
    return result;
  }, [items, pins, shouldRender, rowSize, hidePins]);

  // virtualization
  const [containerRef, { width }] = useElementSize();
  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    overscan: 2,
    estimateSize: () => {
      const itemWidth = (width - GAP * (rowSize - 1)) / rowSize;
      return itemWidth * ASPECT_RATIO;
    },
    scrollMargin: containerRef.current?.offsetTop ?? 0,
  });

  // fixes react compiler issue: https://github.com/TanStack/virtual/issues/743
  const virtualizerRef = useRef(virtualizer);
  const virtualList = virtualizerRef.current.getVirtualItems();

  const style = {
    "--grid-columns": rowSize,
  } as CSSProperties;

  return (
    <div className="w-full py-2" ref={containerRef}>
      <Portal to="#objekt-total">{total}</Portal>

      <div
        className="relative flex flex-col contain-paint will-change-transform"
        style={{
          height: `${virtualizerRef.current.getTotalSize()}px`,
        }}
      >
        {virtualList.map((rowItem) => {
          const row = rows[rowItem.index];
          return (
            <div
              key={rowItem.key}
              style={{
                ...style,
                width: "100%",
                transform: `translateY(${rowItem.start - virtualizerRef.current.options.scrollMargin}px)`,
                paddingTop: rowItem.index === 0 ? 0 : `${GAP}px`,
              }}
              data-index={rowItem.index}
              ref={virtualizerRef.current.measureElement}
              className="absolute top-0 left-0 grid gap-4 grid-cols-3 md:grid-cols-[repeat(var(--grid-columns),_minmax(0,_1fr))]"
            >
              {row.map((objekt) => {
                // render pin
                if (objekt.type === "pin" && hidePins === false) {
                  const legacyObjekt = Objekt.fromLegacy(objekt.item);
                  return (
                    <ExpandableObjekt
                      key={objekt.item.tokenId}
                      objekt={legacyObjekt}
                      id={objekt.item.tokenId}
                    >
                      <LegacyOverlay
                        objekt={objekt.item}
                        slug={legacyObjekt.slug}
                        authenticated={authenticated}
                        isPinned={
                          pins.findIndex(
                            (p) => p.tokenId === objekt.item.tokenId
                          ) !== -1
                        }
                        isPin={true}
                      />
                    </ExpandableObjekt>
                  );
                }

                // render non-pin items
                if (objekt.type === "item") {
                  const element = children({
                    item: objekt.item,
                    id: getObjektId(objekt.item),
                    isPin: false,
                  });

                  return element
                    ? cloneElement(element, { key: getObjektId(objekt.item) })
                    : null;
                }
              })}
            </div>
          );
        })}
      </div>

      <Portal to="#pagination">
        <InfiniteQueryNext
          status={query.status}
          hasNextPage={query.hasNextPage}
          isFetchingNextPage={query.isFetchingNextPage}
          fetchNextPage={query.fetchNextPage}
        />
      </Portal>
    </div>
  );
}
