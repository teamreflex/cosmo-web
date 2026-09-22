import { ObjektSidebar } from "@/components/objekt/common";
import { Skeleton } from "@/components/ui/skeleton";
import { useElementSize } from "@/hooks/use-element-size";
import { useGridElementVirtualizer } from "@/hooks/use-grid-virtualizer";
import { m } from "@/i18n/messages";
import { getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import { Objekt } from "@/lib/universal/objekt-conversion";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import { IconLock } from "@tabler/icons-react";
import { useEffect } from "react";
import type { RefObject } from "react";

/** The picker is three columns wide everywhere, in a column or a drawer. */
const PICKER_COLUMNS = 3;
const GAP = 8;
const ASPECT_RATIO = 8.5 / 5.5;

type Props = {
  objekts: CosmoObjekt[];
  scrollElement: RefObject<HTMLDivElement | null>;
  inBinderTokenIds: ReadonlySet<number>;
  lockedTokenIds: ReadonlySet<number>;
  onPick: (objekt: CosmoObjekt) => void;
};

/**
 * The picker's objekts, virtualized against the picker's own scroll container
 * instead of the window.
 */
export default function PickerGrid({
  objekts,
  scrollElement,
  inBinderTokenIds,
  lockedTokenIds,
  onPick,
}: Props) {
  const [containerRef, { width }] = useElementSize({ axis: "width" });
  const laneWidth = Math.max(
    0,
    (width - GAP * (PICKER_COLUMNS - 1)) / PICKER_COLUMNS,
  );
  // rounded so it stays exact as the virtualizer accumulates it down the list
  const itemHeight = Math.round(laneWidth * ASPECT_RATIO);

  const { items, totalSize, scrollMargin, measureElement, measure } =
    useGridElementVirtualizer({
      count: objekts.length,
      lanes: PICKER_COLUMNS,
      gap: GAP,
      itemHeight,
      container: containerRef,
      scrollElement,
    });

  // re-measure cells when the picker is resized
  useEffect(() => {
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
          const tokenId = Number(objekt.tokenId);

          return (
            <div
              key={objekt.tokenId}
              data-index={item.index}
              ref={measureElement}
              className="absolute top-0"
              style={{
                transform: `translateY(${item.start - scrollMargin}px)`,
                left: `${item.lane * (laneWidth + GAP)}px`,
                width: `${laneWidth}px`,
              }}
            >
              <PickerCard
                objekt={objekt}
                inBinder={inBinderTokenIds.has(tokenId)}
                locked={lockedTokenIds.has(tokenId)}
                priority={item.index < PICKER_COLUMNS * 4}
                onPick={onPick}
              />
            </div>
          );
        })}
    </div>
  );
}

type PickerCardProps = {
  objekt: CosmoObjekt;
  inBinder: boolean;
  locked: boolean;
  priority: boolean;
  onPick: (objekt: CosmoObjekt) => void;
};

/**
 * One pickable objekt: the plain front image, dimmed with an "in binder" label
 * when it's already placed. Placed objekts stay pickable, because picking one
 * moves it to the selected pocket.
 */
function PickerCard({
  objekt,
  inBinder,
  locked,
  priority,
  onPick,
}: PickerCardProps) {
  const { collection, objekt: token } = Objekt.fromLegacy(objekt);

  return (
    <div className="@container">
      <button
        type="button"
        onClick={() => onPick(objekt)}
        aria-label={[
          `${collection.member} ${collection.season} ${collection.collectionNo}${token.serial > 0 ? ` #${token.serial}` : ""}`,
          locked ? m.common_locked() : null,
          inBinder ? m.binder_picker_in_binder() : null,
        ]
          .filter((part) => part !== null)
          .join(", ")}
        style={{
          "--objekt-background-color": collection.backgroundColor,
          "--objekt-text-color": collection.textColor,
        }}
        className="relative block aspect-photocard w-full cursor-pointer touch-manipulation overflow-hidden rounded-photocard bg-secondary outline-2 outline-transparent transition-[outline-color] duration-150 hover:outline-(--objekt-background-color) focus-visible:outline-cosmo"
      >
        <img
          src={getObjektFrontImageUrl(collection, "xs")}
          alt=""
          width={291}
          height={450}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          className="w-full"
        />
        <ObjektSidebar collection={collection} serial={token.serial} />

        {inBinder && (
          <span className="absolute inset-0 flex flex-col justify-end bg-black/60">
            <span className="bg-black/70 py-[3px] text-center font-mono text-[9px] text-neutral-200">
              {m.binder_picker_in_binder()}
            </span>
          </span>
        )}

        {locked && (
          <span className="absolute top-[4cqw] left-[4cqw] grid size-5 place-items-center rounded-md bg-black/60 text-white">
            <IconLock className="size-3" stroke={2.4} />
          </span>
        )}
      </button>
    </div>
  );
}

export function PickerGridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: PICKER_COLUMNS * 4 }, (_, i) => (
        <Skeleton
          key={i}
          className="aspect-photocard w-full rounded-photocard"
        />
      ))}
    </div>
  );
}
