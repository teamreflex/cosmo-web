import { cloneElement, useRef } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { LegacyOverlay } from "../collection/data-sources/common-legacy";
import ExpandableObjekt from "./objekt-expandable";
import type { ReactElement } from "react";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { useElementSize } from "@/hooks/use-element-size";

type RenderProps<T> = {
  id: string | number;
  item: T;
  isPin: boolean;
  priority: boolean;
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

type Props<TItem> = {
  children: (props: RenderProps<TItem>) => ReactElement | null;
  rows: ObjektRowItem<TItem>[][];
  getObjektId: (objekt: TItem) => string;
  gridColumns: number;
  authenticated: boolean;
};

const GAP = 16;
const ASPECT_RATIO = 8.5 / 5.5;

export default function VirtualizedGrid<TItem>({
  children,
  rows,
  getObjektId,
  authenticated,
  gridColumns,
}: Props<TItem>) {
  // virtualization
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

  console.log({ width });

  // fixes react compiler issue: https://github.com/TanStack/virtual/issues/743
  const virtualizerRef = useRef(virtualizer);
  const virtualList = virtualizerRef.current.getVirtualItems();

  return (
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
                const element = children({
                  item: objekt.item,
                  id: getObjektId(objekt.item),
                  isPin: false,
                  // preload items in the first 4 rows
                  priority: index <= gridColumns * 4,
                });

                return element
                  ? cloneElement(element, { key: getObjektId(objekt.item) })
                  : null;
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
