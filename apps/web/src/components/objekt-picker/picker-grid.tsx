import { ObjektSidebar } from "@/components/objekt/common";
import { Skeleton } from "@/components/ui/skeleton";
import { useElementSize } from "@/hooks/use-element-size";
import { useGridElementVirtualizer } from "@/hooks/use-grid-virtualizer";
import { getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import { useLayoutEffect } from "react";
import type { ReactNode, RefObject } from "react";

/**
 * The picker is at least three columns wide, as in the column beside the page
 * or a phone's sheet, and adds columns in a wider sheet to keep cards around
 * this width.
 */
const MIN_COLUMNS = 3;
const CARD_WIDTH = 120;
const GAP = 8;
const ASPECT_RATIO = 8.5 / 5.5;

function columnsFor(width: number) {
  return Math.max(MIN_COLUMNS, Math.floor((width + GAP) / (CARD_WIDTH + GAP)));
}

type Props = {
  objekts: CosmoObjekt[];
  scrollElement: RefObject<HTMLDivElement | null>;
  /**
   * One objekt's card. `priority` marks the first screenful, whose images
   * load first.
   */
  renderCard: (
    objekt: CosmoObjekt,
    options: { priority: boolean },
  ) => ReactNode;
};

/**
 * The picker's objekts, virtualized against the picker's own scroll container
 * instead of the window. Each cell holds whatever card the picker's owner
 * renders, so memoized cards only re-render when their own props change.
 */
export default function PickerGrid({
  objekts,
  scrollElement,
  renderCard,
}: Props) {
  const [containerRef, { width }] = useElementSize({ axis: "width" });
  const columns = columnsFor(width);
  const laneWidth = Math.max(0, (width - GAP * (columns - 1)) / columns);
  // rounded so it stays exact as the virtualizer accumulates it down the list
  const itemHeight = Math.round(laneWidth * ASPECT_RATIO);

  const { items, totalSize, scrollMargin, measure } = useGridElementVirtualizer(
    {
      count: objekts.length,
      lanes: columns,
      gap: GAP,
      itemHeight,
      container: containerRef,
      scrollElement,
    },
  );

  /**
   * Every card is the same known height, so cells aren't measured from the
   * DOM. A resize re-lays out every row before paint, since the virtualizer
   * caches positions and lanes that stale cell sizes could otherwise scramble.
   */
  useLayoutEffect(() => {
    measure();
  }, [itemHeight, measure]);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: `${totalSize}px` }}
    >
      {/* until the width is known every row is ~0px tall, which would mount every cell */}
      {laneWidth > 0 &&
        items.map((item) => {
          const objekt = objekts[item.index];
          if (!objekt) return null;

          return (
            <div
              key={objekt.tokenId}
              className="absolute top-0"
              style={{
                transform: `translateY(${item.start - scrollMargin}px)`,
                left: `${item.lane * (laneWidth + GAP)}px`,
                width: `${laneWidth}px`,
              }}
            >
              {renderCard(objekt, { priority: item.index < columns * 4 })}
            </div>
          );
        })}
    </div>
  );
}

type PickerCardFaceProps = {
  collection: Objekt.Collection;
  serial: number | undefined;
  priority: boolean;
};

/**
 * A picker card's face: the plain front image with the collection number
 * and serial down its band. Cards put it inside their own button. Past the
 * first screenful (`priority`) an image loads as it nears the viewport.
 */
export function PickerCardFace({
  collection,
  serial,
  priority,
}: PickerCardFaceProps) {
  return (
    <>
      <img
        src={getObjektFrontImageUrl(collection, "xs")}
        alt=""
        width={291}
        height={450}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        loading={priority ? "eager" : "lazy"}
        className="w-full"
      />
      <ObjektSidebar collection={collection} serial={serial} />
    </>
  );
}

/**
 * Four rows of placeholders, as many columns wide as the loaded grid would be
 * at this width.
 */
export function PickerGridSkeleton() {
  const [containerRef, { width }] = useElementSize({ axis: "width" });
  const columns = columnsFor(width);

  return (
    <div
      ref={containerRef}
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: columns * 4 }, (_, i) => (
        // the photocard radius is sized against a container
        <div key={i} className="@container">
          <Skeleton className="aspect-photocard w-full rounded-photocard" />
        </div>
      ))}
    </div>
  );
}
