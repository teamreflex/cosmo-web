/* eslint-disable react-compiler/react-compiler */
import { useElementSize } from "@/hooks/use-element-size";
import { cloneElement, ReactElement } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { Objekt } from "@/lib/universal/objekt-conversion";
import ExpandableObjekt from "./objekt-expandable";
import { LegacyOverlay } from "../collection/data-sources/common-legacy";
import { CosmoObjekt } from "@/lib/universal/cosmo/objekts";

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

type Props<Item> = {
  children: (props: RenderProps<Item>) => ReactElement | null;
  rows: ObjektRowItem<Item>[][];
  pins?: CosmoObjekt[];
  getObjektId: (objekt: Item) => string;
  gridColumns: number;
  authenticated: boolean;
};

const GAP = 16;
const ASPECT_RATIO = 8.5 / 5.5;

export default function VirtualizedGrid<Item>({
  children,
  rows,
  pins = [],
  getObjektId,
  authenticated,
  gridColumns,
}: Props<Item>) {
  // virtualization
  const [containerRef, { width }] = useElementSize();
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
    <div className="w-full py-2" ref={containerRef}>
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
              className="absolute top-0 left-0 w-full px-0.5 grid gap-4 grid-cols-3 md:grid-cols-[repeat(var(--grid-columns),_minmax(0,_1fr))]"
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
                    // preload items in the first 4 rows
                    priority: index <= gridColumns * 4,
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
    </div>
  );
}
