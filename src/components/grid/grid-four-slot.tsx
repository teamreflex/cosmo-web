import { useGrid } from "@/hooks/use-grid";
import { CosmoOngoingGrid } from "@/lib/server/cosmo";
import SlotSelector from "./slot-selector";
import { cn } from "@/lib/utils";
import GridObjekt from "./grid-objekt";

const positions: Record<number, number> = {
  0: 2,
  1: 4,
  2: 6,
  3: 8,
};

export default function GridFourSlot({
  slug,
  grid,
}: {
  slug: string;
  grid: CosmoOngoingGrid;
}) {
  const [objekts, populateSlot] = useGrid(slug, grid.ongoing.slotStatuses);

  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-4 w-full md:w-2/3">
      <div className="aspect-photocard bg-transparent w-full order-1" />
      <div className="aspect-photocard bg-transparent w-full order-3" />
      <div className="aspect-photocard bg-transparent w-full order-7" />
      <div className="aspect-photocard bg-transparent w-full order-9" />
      <div className="aspect-photocard w-full flex justify-center items-center order-5">
        <p className="text-5xl">?</p>
      </div>
      {objekts.map((slot, idx) => {
        if (slot.populated) {
          return (
            <SlotSelector
              collectionId={slot.collectionId}
              currentSlot={slot}
              populateSlot={populateSlot}
              key={slot.collectionNo}
            >
              <div
                className={cn(
                  "relative aspect-photocard rounded-lg bg-accent w-full flex justify-center items-center hover:cursor-pointer",
                  `order-${positions[idx]}`
                )}
              >
                <GridObjekt
                  image={slot.image}
                  collectionNo={slot.collectionNo}
                  objektNo={slot.objektNo}
                  textColor={slot.textColor}
                  selected={false}
                />
              </div>
            </SlotSelector>
          );
        } else {
          return (
            <div
              className={cn(
                "relative aspect-photocard rounded-lg bg-accent w-full flex justify-center items-center",
                `order-${positions[idx]}`
              )}
              key={slot.collectionNo}
            >
              <p className="text-white/20 text-3xl">{slot.collectionNo}</p>
            </div>
          );
        }
      })}
    </div>
  );
}
